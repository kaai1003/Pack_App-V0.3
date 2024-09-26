import io
import os
from datetime import datetime

import barcode
import win32api
import win32print
from flask import Flask, jsonify, request
from flask_cors import CORS
from reportlab.graphics.barcode import code128
from reportlab.lib.pagesizes import mm
from reportlab.pdfgen import canvas

# Create Flask application
app = Flask(__name__)
CORS(app)


# Define route to fetch and return lineId environment variable
@app.route('/env')
def get_env_variable():
    line_id = os.getenv('lineId', 'Environment variable lineId not set')
    return jsonify({"lineId": line_id})


@app.route('/printers', methods=['GET'])
def list_printers():
    printers = [printer[2] for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL)]
    return jsonify({'printers': printers})


@app.route('/get-default-printer', methods=['GET'])
def get_default_printers():
    printer = win32print.GetDefaultPrinter()
    return jsonify({'defaultPrinter': printer})


@app.route('/set-default-printer', methods=['POST'])
def set_default_printer():
    printer_name = request.json.get('printerName')

    try:
        win32print.SetDefaultPrinter(printer_name)
        return jsonify({'success': True, 'message': f'Successfully set {printer_name} as default printer.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/print-label', methods=['POST'])
def print_label():
    # Get the label content from the request
    label_content = request.json.get('label_content', 'Default Label')
    barcode_content = request.json.get('barcode_content', '123456789012')
    operator = request.json.get('operator', '112233')
    # Create a PDF with reportlab
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=(50 * mm, 25 * mm))  # Label size 50mm x 25mm

    # Draw the label text on the PDF
    c.setFont("Helvetica", 10)
    c.drawString(12 * mm, 22 * mm, "contenu-contenant")  # Adjust position as needed
    # Generate a barcode using the Code128 class
    barcode = code128.Code128(barcode_content, barHeight=10 * mm, barWidth=0.3 * mm)

    # Draw the barcode on the PDF
    barcode.drawOn(c, 5 * mm, 10 * mm)  # Adjust position as needed

    # Draw the label text on the PDF
    c.setFont("Helvetica", 8)
    c.drawString(10 * mm, 7 * mm, barcode_content)

    c.setFont("Helvetica", 6)
    c.drawString(3 * mm, 2 * mm, f"Operator: {operator}")

    # date  time
    current_datetime = datetime.now().strftime("%d-%m-%y %H-%M")
    c.setFont("Helvetica", 6)
    c.drawString(25 * mm, 2 * mm, f"Date: {current_datetime}")
    # line
    c.saveState()
    c.translate(3 * mm, 6 * mm)  # Move the origin (x, y) to where you want the text
    c.rotate(90)  # Rotate the text by 90 degrees for vertical alignment
    c.setFont("Helvetica", 5)
    c.drawString(0, 0, "Line: PPL")  # (0,0) because the origin is moved and rotated
    c.restoreState()
    # Finalize the PDF
    c.showPage()
    c.save()

    pdf_buffer.seek(0)

    # Save PDF temporarily
    pdf_file_path = "label.pdf"
    try:
        with open(pdf_file_path, "wb") as f:
            f.write(pdf_buffer.getvalue())

        # Open printer and send to spooler
        printer_name = win32print.GetDefaultPrinter()

        # Start a document
        hPrinter = win32print.OpenPrinter(printer_name)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Label", None, "RAW"))
            win32print.StartPagePrinter(hPrinter)

            # Print the PDF file content to the printer
            with open(pdf_file_path, "rb") as pdf_file:
                pdf_data = pdf_file.read()
                win32print.WritePrinter(hPrinter, pdf_data)

            win32print.EndPagePrinter(hPrinter)
            win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)

        return jsonify({'success': True, 'message': 'Label created, saved as PDF, and sent to printer queue.'}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

    # finally:
        # Cleanup: remove the temporary files
        # if os.path.exists(pdf_file_path):
        #     os.remove(pdf_file_path)


if __name__ == '__main__':
    app.run(port=3000, debug=True)
