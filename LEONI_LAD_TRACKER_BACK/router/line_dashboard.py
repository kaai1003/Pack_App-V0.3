from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta

from database import db
from models.harness import HarnessModel
from models.packaging_box import PackagingBox
from models.prod_harness import ProdHarness

line_dashboard_bp = Blueprint('line_dashboard_bp', __name__)

# Function to apply filters to queries
def apply_filters(query, filters):
    from_date = filters.get('from')
    to_date = filters.get('to')
    shift = filters.get('shift')

    if not from_date:
        from_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if not to_date:
        to_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    query = query.filter(ProdHarness.created_at.between(from_date, to_date))

    shifts_to_include = []
    if shift:
        shifts_to_include.append(shift)
    else:
        shifts_to_include = ['a', 'b', 'c']

    shift_conditions = []
    for shift in shifts_to_include:
        if shift == 'a':
            shift_conditions.append(db.text("HOUR(updated_at) BETWEEN 6 AND 14"))
        elif shift == 'b':
            shift_conditions.append(db.text("HOUR(updated_at) BETWEEN 14 AND 22"))
        elif shift == 'c':
            shift_conditions.append(db.text("(HOUR(updated_at) BETWEEN 22 AND 23) OR (HOUR(updated_at) BETWEEN 0 AND 6)"))

    if shift_conditions:
        query = query.filter(db.or_(*shift_conditions))

    return query


@line_dashboard_bp.route('/api/line-dashboard/total-quantity', methods=['POST'])
def total_quantity():
    try:
        filters = request.json
        query = db.session.query(db.func.count(ProdHarness.id).label('total_quantity')).filter(ProdHarness.status == 2)
        query = apply_filters(query, filters)
        result = query.one()
        return jsonify({'total_quantity': result.total_quantity})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/in-progress-quantity', methods=['POST'])
def get_in_progress_quantity():
    try:
        filters = request.json
        query = db.session.query(db.func.count(ProdHarness.id).label('total_quantity')).filter(ProdHarness.status == 0)
        query = apply_filters(query, filters)
        result = query.one()
        return jsonify({'total_quantity': result.total_quantity})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/average-quantity', methods=['POST'])
def average_quantity():
    try:
        filters = request.json
        query = db.session.query(db.func.avg(ProdHarness).label('average_quantity'))
        query = apply_filters(query, filters)
        result = query.one()
        return jsonify({'average_quantity': result.average_quantity})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/count-by-code-fournisseur', methods=['POST'])
def count_by_code_fournisseur():
    try:
        filters = request.json
        query = db.session.query(
            ProdHarness.harness.ref,
            db.func.count(ProdHarness.id).label('box_count'),
            ProdHarness.harness
        ).join(HarnessModel).group_by(ProdHarness.harness_id)
        query = apply_filters(query, filters)
        result = query.all()
        data = [{'code_fournisseur': row.harness.ref, 'box_count': row.box_count} for row in result]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/count-by-hour', methods=['POST'])
def count_by_hour():
    try:
        filters = request.json
        query = db.session.query(
            db.func.hour(ProdHarness.updated_at).label('hour'),
            db.func.count(ProdHarness.id).label('box_count')
        ).group_by(db.func.hour(ProdHarness.updated_at))
        query = apply_filters(query, filters)
        result = query.all()
        data = [{'hour': row.hour, 'box_count': row.box_count} for row in result]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/quantity-by-hour', methods=['POST'])
def quantity_by_hour():
    try:
        filters = request.json
        query = db.session.query(
            db.func.hour(ProdHarness.updated_at).label('hour'),
            db.func.count(ProdHarness.id).label('total_quantity')
        ).group_by(db.func.hour(ProdHarness.updated_at))
        query = apply_filters(query, filters)
        query = query.order_by(db.func.hour(ProdHarness.updated_at))
        result = query.all()
        data = [{'hour': row.hour, 'total_quantity': row.total_quantity} for row in result]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/productive-hours', methods=['POST'])
def productive_hours():
    try:
        filters = request.json
        temps_game = filters.get('temps_game', 0)
        start_time = filters.get('from')
        end_time = filters.get('to')
        vsm = filters.get('vsm')

        if not start_time or not end_time:
            return jsonify({'error': 'start and end times are required'}), 400

        start_time = datetime.strptime(start_time, '%Y-%m-%d %H:%M:%S')
        end_time = datetime.strptime(end_time, '%Y-%m-%d %H:%M:%S')

        total_time = (end_time - start_time).total_seconds() / 3600

        query = db.session.query(db.func.count(ProdHarness.id).label('total_quantity'))
        query = apply_filters(query, filters)
        result = query.one()

        if result.total_quantity is None:
            total_quantity = 0
        else:
            total_quantity = result.total_quantity

        productive_hours = (total_quantity * temps_game) / vsm if temps_game else 0
        efficiency = (total_quantity * temps_game) / (vsm * total_time) * 100 if total_time > 0 else 0
        expected = (vsm * total_time) / temps_game if temps_game > 0 else 0

        return jsonify({
            'posted_hours': total_time,
            'productive_hours': productive_hours,
            'total_quantity': total_quantity,
            'efficiency': efficiency,
            'expected': expected
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/sum-by-code-fournisseur', methods=['POST'])
def sum_by_code_fournisseur():
    try:
        filters = request.json
        query = db.session.query(
            HarnessModel.ref.label('code_fournisseur'),
            db.func.count(ProdHarness.id).label('total_quantity')
        ).join(HarnessModel, ProdHarness.harness_id == HarnessModel.id).group_by(HarnessModel.ref)
        
        # Apply the filters, specifying the correct table for 'updated_at'
        query = query.filter(
            ProdHarness.created_at.between(filters['from'], filters['to']),
            db.or_(
                db.func.hour(ProdHarness.updated_at).between(6, 14),
                db.func.hour(ProdHarness.updated_at).between(14, 22),
                db.func.hour(ProdHarness.updated_at).between(22, 23),
                db.func.hour(ProdHarness.updated_at).between(0, 6)
            )
        )

        result = query.all()
        
        data = [{'code_fournisseur': row.code_fournisseur, 'total_quantity': row.total_quantity} for row in result]
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@line_dashboard_bp.route('/api/line-dashboard/total-quantity-current', methods=['POST'])
def total_quantity_current():
    try:
        query = db.session.query(db.func.count(ProdHarness.id).label('total_quantity'))
        result = query.one()
        return jsonify({'total_quantity': result.total_quantity})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@line_dashboard_bp.route('/api/line-dashboard/box-count', methods=['POST'])
def total_box_count():
    try:
        query = db.session.query(db.func.count(PackagingBox.id).label('total_quantity'))
        result = query.one()
        return jsonify({'total_quantity': result.total_quantity})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/quantity-by-date', methods=['POST'])
def quantity_by_date():
    try:
        filters = request.json
        query = db.session.query(
            db.func.date(ProdHarness.updated_at).label('formatted_date'),
            db.func.count(ProdHarness.id).label('total_quantity')
        ).group_by(db.func.date(ProdHarness.updated_at))
        query = apply_filters(query, filters)
        query = query.order_by(db.func.date(ProdHarness.updated_at))
        result = query.all()
        data = [{'date': row.formatted_date, 'total_quantity': row.total_quantity} for row in result]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/quantity-by-month', methods=['POST'])
def quantity_by_month():
    try:
        filters = request.json
        query = db.session.query(
            db.func.date_format(ProdHarness.updated_at, '%Y-%m').label('month'),
            db.func.count(ProdHarness.id).label('total_quantity')
        ).group_by(db.func.date_format(ProdHarness.updated_at, '%Y-%m'))
        query = apply_filters(query, filters)
        query = query.order_by(db.func.date_format(ProdHarness.updated_at, '%Y-%m'))
        result = query.all()
        data = [{'month': row.month, 'total_quantity': row.total_quantity} for row in result]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# @line_dashboard_bp.route('/api/line-dashboard/efficiency-by-hour', methods=['POST'])
# def efficiency_by_hour():
#     try:
#         filters = request.json
#         vsm = filters.get('vsm')  # Number of operators
#         temps_game = filters.get('temps_game', 3.8)  # Default value if not provided

#         if not vsm or vsm <= 0:
#             return jsonify({'error': 'vsm (number of operators) is required and should be greater than 0'}), 400

#         from_date = filters.get('from')
#         to_date = filters.get('to')

#         if not from_date or not to_date:
#             return jsonify({'error': 'Both "from" and "to" dates are required'}), 400

#         # Updated date parsing to the correct format
#         from_date = datetime.strptime(from_date, '%Y-%m-%d %H:%M:%S')
#         to_date = datetime.strptime(to_date, '%Y-%m-%d %H:%M:%S')

#         query = db.session.query(
#             db.func.hour(ProdHarness.updated_at).label('hour'),
#             db.func.count(ProdHarness.id).label('total_quantity'),
#             ProdHarness.range_time
#         ).filter(ProdHarness.updated_at.between(from_date, to_date))

#         query = apply_filters(query, filters)
#         query = query.group_by(db.func.hour(ProdHarness.updated_at), ProdHarness.range_time)
#         query = query.order_by(db.func.hour(ProdHarness.updated_at))

#         result = query.all()

#         data_by_hour = {row.hour: row for row in result}

#         # Initialize list to store results for all hours
#         data = []
#         current_hour = from_date.replace(minute=0, second=0, microsecond=0)

#         while current_hour <= to_date:
#             hour = current_hour.hour

#             if hour in data_by_hour:
#                 row = data_by_hour[hour]
#                 total_quantity = float(row.total_quantity or 0)
#                 range_time = float(row.range_time or 1)
#                 productive_hours = (total_quantity * range_time) / vsm if range_time else 0
#                 efficiency = ((total_quantity * range_time) / vsm) * 100 if range_time > 0 else 0
#             else:
#                 total_quantity = 0
#                 range_time = 0
#                 productive_hours = 0
#                 efficiency = 0

#             data.append({
#                 'hour': hour,
#                 'total_quantity': total_quantity,
#                 'range_time': range_time,
#                 'productive_hours': productive_hours,
#                 'efficiency': efficiency
#             })

#             current_hour += timedelta(hours=1)

#         return jsonify(data), 200

#     except ValueError as ve:
#         return jsonify({'error': 'Date format is incorrect: ' + str(ve)}), 400
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500


@line_dashboard_bp.route('/api/line-dashboard/efficiency-by-hour', methods=['POST'])
def efficiency_by_hour():
    try:
        filters = request.json
        vsm = filters.get('vsm')  # Number of operators
        temps_game = filters.get('temps_game')  # Default value if not provided

        if not vsm or vsm <= 0:
            return jsonify({'error': 'vsm (number of operators) is required and should be greater than 0'}), 400

        from_date = filters.get('from')
        to_date = filters.get('to')

        if not from_date or not to_date:
            return jsonify({'error': 'Both "from" and "to" dates are required'}), 400

        # Updated date parsing to the correct format
        from_date = datetime.strptime(from_date, '%Y-%m-%d %H:%M:%S')
        to_date = datetime.strptime(to_date, '%Y-%m-%d %H:%M:%S')

        query = db.session.query(
            db.func.hour(ProdHarness.updated_at).label('hour'),
            db.func.count(ProdHarness.id).label('total_quantity'),
            HarnessModel.range_time
        ).join(HarnessModel, ProdHarness.harness_id == HarnessModel.id)

        query = query.filter(ProdHarness.updated_at.between(from_date, to_date))

        query = query.filter(
            db.or_(
                db.func.hour(ProdHarness.updated_at).between(6, 14),
                db.func.hour(ProdHarness.updated_at).between(14, 22),
                db.func.hour(ProdHarness.updated_at).between(22, 23),
                db.func.hour(ProdHarness.updated_at).between(0, 6)
            )
        )

        query = query.group_by(db.func.hour(ProdHarness.updated_at), HarnessModel.range_time)
        query = query.order_by(db.func.hour(ProdHarness.updated_at))

        result = query.all()

        data_by_hour = {row.hour: row for row in result}

        # Initialize list to store results for all hours
        data = []
        current_hour = from_date.replace(minute=0, second=0, microsecond=0)

        while current_hour <= to_date:
            hour = current_hour.hour

            if hour in data_by_hour:
                row = data_by_hour[hour]
                total_quantity = float(row.total_quantity or 0)
                range_time = float(row.range_time or 1)
                print(range_time)
                productive_hours = (total_quantity * range_time) / vsm if range_time else 0
                efficiency = ((total_quantity * range_time) / vsm) * 100 if range_time > 0 else 0
            else:
                total_quantity = 0
                range_time = 0
                productive_hours = 0
                efficiency = 0

            data.append({
                'hour': hour,
                'total_quantity': total_quantity,
                'range_time': range_time,
                'productive_hours': productive_hours,
                'efficiency': efficiency
            })

            current_hour += timedelta(hours=1)

        return jsonify(data), 200

    except ValueError as ve:
        return jsonify({'error': 'Date format is incorrect: ' + str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@line_dashboard_bp.route('/api/line-dashboard/calculate-efficiency', methods=['POST'])
def calculate_efficiency():
    try:
        filters = request.json
        vsm = filters.get('vsm')  # Number of operators

        if not vsm or vsm <= 0:
            return jsonify({'error': 'vsm (number of operators) is required and should be greater than 0'}), 400

        from_date_str = filters.get('from')
        
        # Get the current datetime and format it as a string
        to_date_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        if not from_date_str:
            return jsonify({'error': 'The "from" date is required'}), 400

        # Parse the date strings into datetime objects
        from_date = datetime.strptime(from_date_str, '%Y-%m-%d %H:%M:%S')
        to_date = datetime.strptime(to_date_str, '%Y-%m-%d %H:%M:%S')

   
        query = db.session.query(
            db.func.hour(ProdHarness.updated_at).label('hour'),
            db.func.count(ProdHarness.id).label('total_quantity'),
            HarnessModel.range_time
        ).join(HarnessModel, ProdHarness.harness_id == HarnessModel.id)

        query = query.filter(ProdHarness.updated_at.between(from_date, to_date))

        query = query.filter(
            db.or_(
                db.func.hour(ProdHarness.updated_at).between(6, 14),
                db.func.hour(ProdHarness.updated_at).between(14, 22),
                db.func.hour(ProdHarness.updated_at).between(22, 23),
                db.func.hour(ProdHarness.updated_at).between(0, 6)
            )
        )

        query = query.group_by(db.func.hour(ProdHarness.updated_at), HarnessModel.range_time)
        query = query.order_by(db.func.hour(ProdHarness.updated_at))

        result = query.all()

        data_by_hour = {row.hour: row for row in result}

        # Initialize list to store results for all hours
        data = []
        current_hour = from_date.replace(minute=0, second=0, microsecond=0)

        while current_hour <= to_date:
            hour = current_hour.hour

            if hour in data_by_hour:
                row = data_by_hour[hour]
                total_quantity = float(row.total_quantity or 0)
                range_time = float(row.range_time or 1)
                productive_hours = (total_quantity * range_time) / vsm if range_time else 0
                efficiency = ((total_quantity * range_time) / vsm) * 100 if range_time > 0 else 0
            else:
                total_quantity = 0
                range_time = 0
                productive_hours = 0
                efficiency = 0

            data.append({
                'hour': hour,
                'total_quantity': total_quantity,
                'range_time': range_time,
                'productive_hours': productive_hours,
                'efficiency': efficiency
            })

            current_hour += timedelta(hours=1)

        # Calculate total efficiency
        total_efficiency = sum(da['efficiency'] for da in data)  # Sum of efficiencies
        count_of_hours_with_data = len(data)  # Count of hours that have data

        # Avoid division by zero
        if count_of_hours_with_data > 0:
            average_efficiency = total_efficiency / count_of_hours_with_data
            print(count_of_hours_with_data)
        else:
            average_efficiency = 0

        return jsonify({'average_efficiency': average_efficiency}), 200

    except ValueError as ve:
        return jsonify({'error': 'Date format is incorrect: ' + str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
