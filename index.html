<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barcode Scanner with Box Tracking</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
        }
        h1 {
            text-align: center;
        }
        .file-input, .scanner-input {
            display: block;
            margin: 10px auto;
            padding: 10px;
            font-size: 18px;
            width: 80%;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        table, th, td {
            border: 1px solid black;
        }
        th, td {
            padding: 10px;
            text-align: center;
        }
        .matched {
            background-color: #90EE90; /* Light green for matched row */
        }
        .completed {
            background-color: #32CD32; /* Darker green for completed row */
            color: white;
        }
    </style>
</head>
<body>

    <h1>Barcode Scanner with Box Tracking</h1>

    <!-- File Upload -->
    <input type="file" id="excelFile" class="file-input" accept=".xlsx, .xls">
    <!-- Barcode Scanner Input -->
    <input type="text" id="scannerInput" class="scanner-input" placeholder="Scan barcode here" disabled autofocus>
    <div id="tableContainer"></div>

    <!-- Load the Excel processing library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script>
        const excelFileInput = document.getElementById('excelFile');
        const scannerInput = document.getElementById('scannerInput');
        const tableContainer = document.getElementById('tableContainer');
        let tableData = [];
        let generatedBarcodes = {}; // Store barcodes for each sales order
        let scannedBoxes = {}; // Store scanned box counts for each sales order

        // Function to handle file input change
        excelFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                tableData = json; // Store data for matching later
                displayTable(json);
                generateBarcodes(json);
                scannerInput.disabled = false; // Enable barcode input after table is displayed
            };
            reader.readAsArrayBuffer(file);
        });

        // Function to display the table with Excel data
        function displayTable(data) {
            let table = '<table><thead><tr>';
            const headers = ["Run", "Drop", "Zone", "Date", "Sales Order", "Name", "Address", "Suburb", "Postcode", "Phone Number", "FP", "CH", "FL", "Weight", "Type"];
            
            // Add headers
            headers.forEach(header => {
                table += `<th>${header}</th>`;
            });
            table += '</tr></thead><tbody>';

            // Add rows from data
            data.slice(1).forEach((row, index) => {
                table += `<tr id="row-${index}">`;
                row.forEach(cell => {
                    // Replace blank cells with a dash
                    table += `<td>${cell || '-'}</td>`; // Display dash if cell is empty
                });
                table += '</tr>';
            });
            table += '</tbody></table>';
            tableContainer.innerHTML = table;
        }

        // Function to generate barcodes with box numbers appended
        function generateBarcodes(data) {
            const salesOrderColumnIndex = 4; // Column E is the Sales Order (index 4)
            const fpColumnIndex = 10; // Column K (index 10)
            const chColumnIndex = 11; // Column L (index 11)
            const flColumnIndex = 12; // Column M (index 12)
            
            data.slice(1).forEach((row, index) => {
                const salesOrder = row[salesOrderColumnIndex];
                const fp = parseInt(row[fpColumnIndex]) || 0;
                const ch = parseInt(row[chColumnIndex]) || 0;
                const fl = parseInt(row[flColumnIndex]) || 0;
                
                const totalBoxes = fp + ch + fl;
                scannedBoxes[salesOrder] = 0; // Initialize scanned boxes for this sales order
                
                // Generate barcodes with ascending box numbers (e.g., SO123456001, SO123456002, etc.)
                for (let i = 1; i <= totalBoxes; i++) {
                    const boxNumber = String(i).padStart(3, '0'); // Ensure 3-digit format
                    const barcode = `${salesOrder}${boxNumber}`;
                    if (!generatedBarcodes[salesOrder]) {
                        generatedBarcodes[salesOrder] = [];
                    }
                    generatedBarcodes[salesOrder].push(barcode);
                }
            });
        }

        // Function to handle barcode scanning
        function handleScan(barcode) {
            let matched = false;
            
            // Loop through generated barcodes to find a match for the scanned barcode
            Object.keys(generatedBarcodes).forEach((salesOrder, index) => {
                if (generatedBarcodes[salesOrder].includes(barcode)) {
                    // Find the row with the matching sales order
                    const rowIndex = tableData.findIndex(row => row[4] === salesOrder); // Column 4 is Sales Order
                    if (rowIndex !== -1) {
                        scannedBoxes[salesOrder] += 1; // Increment the scanned box count
                        document.getElementById(`row-${rowIndex - 1}`).classList.add('matched'); // Highlight matched row
                        
                        // If all boxes are scanned, mark the row as complete
                        if (scannedBoxes[salesOrder] === generatedBarcodes[salesOrder].length) {
                            document.getElementById(`row-${rowIndex - 1}`).classList.add('completed'); // Mark row as completed
                        }
                    }
                    matched = true;
                }
            });

            if (!matched) {
                alert('Sales Order not found or barcode invalid');
            }
        }

        // Listen for barcode scanner input
        scannerInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const barcode = scannerInput.value.trim();
                if (barcode) {
                    handleScan(barcode);
                    scannerInput.value = ''; // Clear input field
                }
            }
        });

    </script>

</body>
</html>
