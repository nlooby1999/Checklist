<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barcode Scanner with Mark Off & Check Off Modes</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
        }
        h1 {
            text-align: center;
        }
        .file-input, .scanner-input, .toggle-btn, .clear-btn, .report-btn {
            display: block;
            margin: 10px auto;
            padding: 10px;
            font-size: 18px;
            width: 80%;
            cursor: pointer;
            text-align: center;
            border: 2px solid #333;
            background-color: #ddd;
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

    <h1>Barcode Scanner with Mark Off & Check Off Modes</h1>

    <!-- File Upload -->
    <input type="file" id="excelFile" class="file-input" accept=".xlsx, .xls">
    <!-- Barcode Scanner Input -->
    <input type="text" id="scannerInput" class="scanner-input" placeholder="Scan barcode here" disabled autofocus>
    <!-- Toggle Button for Modes -->
    <div id="toggleMode" class="toggle-btn">Mode: Mark Off</div>
    <!-- Clear Checklist Button -->
    <div id="clearChecklist" class="clear-btn">Clear Checklist</div>
    <!-- Download Report Button -->
    <div id="downloadReport" class="report-btn">Download Report</div>
    
    <div id="tableContainer"></div>

    <!-- Load the Excel processing library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script>
        const excelFileInput = document.getElementById('excelFile');
        const scannerInput = document.getElementById('scannerInput');
        const tableContainer = document.getElementById('tableContainer');
        const toggleModeBtn = document.getElementById('toggleMode');
        const clearChecklistBtn = document.getElementById('clearChecklist');
        const downloadReportBtn = document.getElementById('downloadReport');
        let mode = 'Mark Off'; // Default mode
        let tableData = [];
        let generatedBarcodes = {}; // Store barcodes for each sales order
        let scannedBoxes = {}; // Store scanned box counts for each sales order

        // Toggle between Mark Off and Check Off modes
        toggleModeBtn.addEventListener('click', () => {
            mode = mode === 'Mark Off' ? 'Check Off' : 'Mark Off';
            toggleModeBtn.textContent = `Mode: ${mode}`;
        });

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

                        if (mode === 'Mark Off') {
                            document.getElementById(`row-${rowIndex - 1}`).classList.add('matched'); // Highlight individual boxes
                        } else if (mode === 'Check Off' && scannedBoxes[salesOrder] === generatedBarcodes[salesOrder].length) {
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

        // Clear checklist
        clearChecklistBtn.addEventListener('click', function() {
            const confirmed = confirm("Are you sure you want to clear the checklist?");
            if (confirmed) {
                tableContainer.innerHTML = ''; // Clear the table
                generatedBarcodes = {};
                scannedBoxes = {};
                tableData = [];
                localStorage.clear(); // Clear saved state if using localStorage
            }
        });

        // Download checked-off consignments report
        downloadReportBtn.addEventListener('click', function() {
            const completedOrders = [];

            // Loop through tableData to find completed consignments
            tableData.slice(1).forEach((row, index) => {
                const salesOrder = row[4]; // Sales Order column
                if (scannedBoxes[salesOrder] === generatedBarcodes[salesOrder].length) {
                    completedOrders.push(row);
                }
            });

            if (completedOrders.length > 0) {
                const headers = ["Run", "Drop", "Zone", "Date", "Sales Order", "Name", "Address", "Suburb", "Postcode", "Phone Number", "FP", "CH", "FL", "Weight", "Type"];
                let csvContent = "data:text/csv;charset=utf-8,";

                // Add headers
                csvContent += headers.join(",") + "\n";

                // Add rows of completed consignments
                completedOrders.forEach(row => {
                    csvContent += row.join(",") + "\n";
                });

                // Create a link element to download the CSV
               
