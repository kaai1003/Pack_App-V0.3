from flask import jsonify

from models.packaging_box import PackagingBox
from database import db
from models.prod_harness import ProdHarness
from sqlalchemy.orm import sessionmaker

class PackagingBoxService:
    @staticmethod
    def create_packaging_box(line_id, to_be_delivered_quantity, delivered_quantity, harness_id, status, created_by, barcode):
        packaging_box = PackagingBox(line_id=line_id, to_be_delivered_quantity=to_be_delivered_quantity,
                                     delivered_quantity=delivered_quantity, harness_id=harness_id,
                                     status=status, created_by=created_by, barcode=barcode)
        db.session.add(packaging_box)
        db.session.commit()
        return packaging_box

    @staticmethod
    def get_packaging_box_by_id(box_id):
        return PackagingBox.query.get(box_id)

    @staticmethod
    def update_packaging_box(box_id, line_id=None, to_be_delivered_quantity=None, delivered_quantity=None, harness_id=None, status=None, created_by=None, barcode=None):
        packaging_box = PackagingBoxService.get_packaging_box_by_id(box_id)
        if packaging_box:
            if line_id is not None:
                packaging_box.line_id = line_id
            if to_be_delivered_quantity is not None:
                packaging_box.to_be_delivered_quantity = to_be_delivered_quantity
            if delivered_quantity is not None:
                packaging_box.delivered_quantity = delivered_quantity
            if harness_id is not None:
                packaging_box.harness_id = harness_id
            if status is not None:
                packaging_box.status = status
            if created_by is not None:
                packaging_box.created_by = created_by
            if barcode is not None:
                packaging_box.barcode = barcode
            db.session.commit()
        return packaging_box

    @staticmethod
    def delete_packaging_box(box_id):
        packaging_box = PackagingBoxService.get_packaging_box_by_id(box_id)

        if packaging_box:
            # Access related objects before deleting to prevent DetachedInstanceError
            packaging_box_dict = packaging_box.to_dict()  # Fetch all the data before deletion

            # Delete all related harnesses
            for harness in packaging_box.prod_harness:
                db.session.delete(harness)

            # Delete the packaging box itself
            db.session.delete(packaging_box)

            try:
                # Commit the transaction
                db.session.commit()
            except Exception as e:
                db.session.rollback()  # Rollback in case of error
                raise RuntimeError(f"Error deleting packaging box {box_id}: {str(e)}")

            # Return the dictionary containing the data of the deleted packaging box
            return jsonify(packaging_box_dict)

        return jsonify({'error': 'Packaging box not found'}), 404

    @staticmethod
    def get_all_packaging_boxes():
        return PackagingBox.query.all()

    @staticmethod
    def get_opened_package(line_id):
        return PackagingBox.query.filter(PackagingBox.line_id == line_id, PackagingBox.status < 2).all()

    @staticmethod
    def check_if_box_exist(box_ref):
        harness = PackagingBox.query.filter_by(barcode=box_ref).first()
        if harness:
            return True
        else:
            return False

    
    @staticmethod
    def set_packaging_box_default(box_id):
        try:
            # Start a session
            all_opened = db.session.query(PackagingBox).filter(PackagingBox.status < 2).all()
            
            # Reset their status to 0
            for box in all_opened:
                box.status = 0

            # Fetch the selected packaging box
            selected = db.session.query(PackagingBox).filter(PackagingBox.id == box_id).first()
            if selected:
                selected.status = 1
            
            # Commit all changes at once
            db.session.commit()
            return True  # Return True if operation is successful
        
        except Exception as e:
            db.session.rollback()
            print(f"Error occurred: {e}")  # Log the error for debugging
            return False  # Return False if operation failed

        finally:
            db.session.close()