diff --git a/index.html b/index.html
index 6f0579ef24e0fb6e79470bba6a9a97c20e591bc3..54a33700a65f25bf483bbfb703db2b958389864a 100644
--- a/index.html
+++ b/index.html
@@ -1,219 +1,460 @@
-<!DOCTYPE html>
-<html lang="en">
-<head>
-    <meta charset="UTF-8">
-    <meta name="viewport" content="width=device-width, initial-scale=1.0">
-    <title>Barcode Scanner with Mark Off & Check Off Modes</title>
-    <style>
-        body {
-            font-family: Arial, sans-serif;
-            margin: 20px;
-            background-color: #f4f4f4;
-        }
-        h1 {
-            text-align: center;
-        }
-        .file-input, .scanner-input, .toggle-btn, .clear-btn, .report-btn {
-            display: block;
-            margin: 10px auto;
-            padding: 10px;
-            font-size: 18px;
-            width: 80%;
-            cursor: pointer;
-            text-align: center;
-            border: 2px solid #333;
-            background-color: #ddd;
-        }
-        table {
-            width: 100%;
-            border-collapse: collapse;
-            margin-top: 20px;
-        }
-        table, th, td {
-            border: 1px solid black;
-        }
-        th, td {
-            padding: 10px;
-            text-align: center;
-        }
-        .matched {
-            background-color: #90EE90; /* Light green for matched row */
-        }
-        .completed {
-            background-color: #32CD32; /* Darker green for completed row */
-            color: white;
-        }
-    </style>
-</head>
-<body>
-
-    <h1>Barcode Scanner with Mark Off & Check Off Modes</h1>
-
-    <!-- File Upload -->
-    <input type="file" id="excelFile" class="file-input" accept=".xlsx, .xls">
-    <!-- Barcode Scanner Input -->
-    <input type="text" id="scannerInput" class="scanner-input" placeholder="Scan barcode here" disabled autofocus>
-    <!-- Toggle Button for Modes -->
-    <div id="toggleMode" class="toggle-btn">Mode: Mark Off</div>
-    <!-- Clear Checklist Button -->
-    <div id="clearChecklist" class="clear-btn">Clear Checklist</div>
-    <!-- Download Report Button -->
-    <div id="downloadReport" class="report-btn">Download Report</div>
-    
-    <div id="tableContainer"></div>
-
-    <!-- Load the Excel processing library -->
-    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
-    <script>
-        const excelFileInput = document.getElementById('excelFile');
-        const scannerInput = document.getElementById('scannerInput');
-        const tableContainer = document.getElementById('tableContainer');
-        const toggleModeBtn = document.getElementById('toggleMode');
-        const clearChecklistBtn = document.getElementById('clearChecklist');
-        const downloadReportBtn = document.getElementById('downloadReport');
-        let mode = 'Mark Off'; // Default mode
-        let tableData = [];
-        let generatedBarcodes = {}; // Store barcodes for each sales order
-        let scannedBoxes = {}; // Store scanned box counts for each sales order
-
-        // Toggle between Mark Off and Check Off modes
-        toggleModeBtn.addEventListener('click', () => {
-            mode = mode === 'Mark Off' ? 'Check Off' : 'Mark Off';
-            toggleModeBtn.textContent = `Mode: ${mode}`;
-        });
-
-        // Function to handle file input change
-        excelFileInput.addEventListener('change', function(event) {
-            const file = event.target.files[0];
-            const reader = new FileReader();
-            reader.onload = function(e) {
-                const data = new Uint8Array(e.target.result);
-                const workbook = XLSX.read(data, { type: 'array' });
-                const firstSheetName = workbook.SheetNames[0];
-                const worksheet = workbook.Sheets[firstSheetName];
-                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
-                tableData = json; // Store data for matching later
-                displayTable(json);
-                generateBarcodes(json);
-                scannerInput.disabled = false; // Enable barcode input after table is displayed
-            };
-            reader.readAsArrayBuffer(file);
-        });
-
-        // Function to display the table with Excel data
-        function displayTable(data) {
-            let table = '<table><thead><tr>';
-            const headers = ["Run", "Drop", "Zone", "Date", "Sales Order", "Name", "Address", "Suburb", "Postcode", "Phone Number", "FP", "CH", "FL", "Weight", "Type"];
-            
-            // Add headers
-            headers.forEach(header => {
-                table += `<th>${header}</th>`;
-            });
-            table += '</tr></thead><tbody>';
-
-            // Add rows from data
-            data.slice(1).forEach((row, index) => {
-                table += `<tr id="row-${index}">`;
-                row.forEach(cell => {
-                    // Replace blank cells with a dash
-                    table += `<td>${cell || '-'}</td>`; // Display dash if cell is empty
-                });
-                table += '</tr>';
-            });
-            table += '</tbody></table>';
-            tableContainer.innerHTML = table;
-        }
-
-        // Function to generate barcodes with box numbers appended
-        function generateBarcodes(data) {
-            const salesOrderColumnIndex = 4; // Column E is the Sales Order (index 4)
-            const fpColumnIndex = 10; // Column K (index 10)
-            const chColumnIndex = 11; // Column L (index 11)
-            const flColumnIndex = 12; // Column M (index 12)
-            
-            data.slice(1).forEach((row, index) => {
-                const salesOrder = row[salesOrderColumnIndex];
-                const fp = parseInt(row[fpColumnIndex]) || 0;
-                const ch = parseInt(row[chColumnIndex]) || 0;
-                const fl = parseInt(row[flColumnIndex]) || 0;
-                
-                const totalBoxes = fp + ch + fl;
-                scannedBoxes[salesOrder] = 0; // Initialize scanned boxes for this sales order
-                
-                // Generate barcodes with ascending box numbers (e.g., SO123456001, SO123456002, etc.)
-                for (let i = 1; i <= totalBoxes; i++) {
-                    const boxNumber = String(i).padStart(3, '0'); // Ensure 3-digit format
-                    const barcode = `${salesOrder}${boxNumber}`;
-                    if (!generatedBarcodes[salesOrder]) {
-                        generatedBarcodes[salesOrder] = [];
-                    }
-                    generatedBarcodes[salesOrder].push(barcode);
-                }
-            });
-        }
-
-        // Function to handle barcode scanning
-        function handleScan(barcode) {
-            let matched = false;
-            
-            // Loop through generated barcodes to find a match for the scanned barcode
-            Object.keys(generatedBarcodes).forEach((salesOrder, index) => {
-                if (generatedBarcodes[salesOrder].includes(barcode)) {
-                    // Find the row with the matching sales order
-                    const rowIndex = tableData.findIndex(row => row[4] === salesOrder); // Column 4 is Sales Order
-                    if (rowIndex !== -1) {
-                        scannedBoxes[salesOrder] += 1; // Increment the scanned box count
-
-                        if (mode === 'Mark Off') {
-                            document.getElementById(`row-${rowIndex - 1}`).classList.add('matched'); // Highlight individual boxes
-                        } else if (mode === 'Check Off' && scannedBoxes[salesOrder] === generatedBarcodes[salesOrder].length) {
-                            document.getElementById(`row-${rowIndex - 1}`).classList.add('completed'); // Mark row as completed
-                        }
-                    }
-                    matched = true;
-                }
-            });
-
-            if (!matched) {
-                alert('Sales Order not found or barcode invalid');
-            }
-        }
-
-        // Clear checklist
-        clearChecklistBtn.addEventListener('click', function() {
-            const confirmed = confirm("Are you sure you want to clear the checklist?");
-            if (confirmed) {
-                tableContainer.innerHTML = ''; // Clear the table
-                generatedBarcodes = {};
-                scannedBoxes = {};
-                tableData = [];
-                localStorage.clear(); // Clear saved state if using localStorage
-            }
-        });
-
-        // Download checked-off consignments report
-        downloadReportBtn.addEventListener('click', function() {
-            const completedOrders = [];
-
-            // Loop through tableData to find completed consignments
-            tableData.slice(1).forEach((row, index) => {
-                const salesOrder = row[4]; // Sales Order column
-                if (scannedBoxes[salesOrder] === generatedBarcodes[salesOrder].length) {
-                    completedOrders.push(row);
-                }
-            });
-
-            if (completedOrders.length > 0) {
-                const headers = ["Run", "Drop", "Zone", "Date", "Sales Order", "Name", "Address", "Suburb", "Postcode", "Phone Number", "FP", "CH", "FL", "Weight", "Type"];
-                let csvContent = "data:text/csv;charset=utf-8,";
-
-                // Add headers
-                csvContent += headers.join(",") + "\n";
-
-                // Add rows of completed consignments
-                completedOrders.forEach(row => {
-                    csvContent += row.join(",") + "\n";
-                });
-
-                // Create a link element to download the CSV
-               
+<!DOCTYPE html>
+<html lang="en">
+<head>
+    <meta charset="UTF-8">
+    <meta name="viewport" content="width=device-width, initial-scale=1.0">
+    <title>Barcode Scanner with Mark Off & Check Off Modes</title>
+    <style>
+        :root {
+            color-scheme: light;
+            --surface: #ffffff;
+            --surface-muted: #f3f6fb;
+            --accent: #2563eb;
+            --accent-dark: #1d4ed8;
+            --text: #1f2937;
+            --text-subtle: #4b5563;
+            --border: #d1d9e6;
+            --success: #22c55e;
+            --success-soft: rgba(34, 197, 94, 0.18);
+            --matched: rgba(59, 130, 246, 0.18);
+        }
+
+        * {
+            box-sizing: border-box;
+        }
+
+        body {
+            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
+            margin: 0;
+            min-height: 100vh;
+            background: linear-gradient(180deg, #e8eef9 0%, #f9fbff 100%);
+            color: var(--text);
+        }
+
+        .app {
+            max-width: 960px;
+            margin: 0 auto;
+            padding: clamp(1.5rem, 5vw, 3.5rem) clamp(1.25rem, 4vw, 2.5rem) 4rem;
+        }
+
+        header {
+            text-align: center;
+            margin-bottom: clamp(1.5rem, 4vw, 2.75rem);
+        }
+
+        h1 {
+            margin: 0;
+            font-size: clamp(1.95rem, 4.8vw, 2.75rem);
+            letter-spacing: 0.04em;
+            text-transform: uppercase;
+            color: var(--accent-dark);
+            text-shadow: 0 10px 25px rgba(29, 78, 216, 0.18);
+        }
+
+        header p {
+            margin: 0.75rem auto 0;
+            max-width: 60ch;
+            font-size: clamp(1rem, 2.8vw, 1.1rem);
+            line-height: 1.55;
+            color: var(--text-subtle);
+        }
+
+        .card {
+            background: var(--surface);
+            border-radius: 18px;
+            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
+            padding: clamp(1.25rem, 4vw, 2rem);
+            border: 1px solid rgba(148, 163, 184, 0.18);
+        }
+
+        .controls {
+            display: grid;
+            gap: 0.9rem;
+        }
+
+        .file-input,
+        .scanner-input,
+        .toggle-btn,
+        .clear-btn,
+        .report-btn {
+            width: 100%;
+            font-size: 1.05rem;
+            padding: 0.85rem 1rem;
+            border-radius: 12px;
+            border: 1px solid var(--border);
+            background: var(--surface-muted);
+            color: inherit;
+            transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
+        }
+
+        .file-input,
+        .scanner-input {
+            background: var(--surface);
+            box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
+        }
+
+        .toggle-btn,
+        .clear-btn,
+        .report-btn {
+            cursor: pointer;
+            font-weight: 600;
+            text-align: center;
+            user-select: none;
+        }
+
+        .toggle-btn {
+            background: var(--accent);
+            color: #fff;
+            border-color: transparent;
+            box-shadow: 0 12px 25px rgba(37, 99, 235, 0.25);
+        }
+
+        .toggle-btn:hover,
+        .toggle-btn:focus-visible {
+            background: var(--accent-dark);
+        }
+
+        .clear-btn {
+            background: #fee2e2;
+            color: #b91c1c;
+            border-color: rgba(248, 113, 113, 0.4);
+        }
+
+        .report-btn {
+            background: var(--surface);
+            border-color: rgba(37, 99, 235, 0.35);
+            color: var(--accent-dark);
+        }
+
+        .toggle-btn:active,
+        .clear-btn:active,
+        .report-btn:active {
+            transform: translateY(1px) scale(0.995);
+        }
+
+        .toggle-btn:focus-visible,
+        .clear-btn:focus-visible,
+        .report-btn:focus-visible,
+        .scanner-input:focus-visible,
+        .file-input:focus-visible {
+            outline: 3px solid rgba(37, 99, 235, 0.35);
+            outline-offset: 2px;
+        }
+
+        .table-wrapper {
+            margin-top: 2rem;
+            border-radius: 16px;
+            overflow: hidden;
+            border: 1px solid rgba(148, 163, 184, 0.22);
+            background: var(--surface);
+            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
+        }
+
+        .table-scroll {
+            overflow-x: auto;
+            -webkit-overflow-scrolling: touch;
+        }
+
+        table {
+            width: 100%;
+            border-collapse: collapse;
+            min-width: 680px;
+        }
+
+        thead {
+            background: linear-gradient(90deg, rgba(37, 99, 235, 0.12), rgba(59, 130, 246, 0.12));
+        }
+
+        th,
+        td {
+            padding: 0.75rem 0.9rem;
+            text-align: center;
+            border-bottom: 1px solid rgba(226, 232, 240, 0.8);
+            font-size: 0.95rem;
+        }
+
+        tbody tr:nth-child(odd) {
+            background: rgba(148, 163, 184, 0.08);
+        }
+
+        tbody tr:last-child td {
+            border-bottom: none;
+        }
+
+        .matched {
+            background: var(--matched) !important;
+        }
+
+        .completed {
+            background: var(--success-soft) !important;
+            color: #166534;
+            font-weight: 600;
+        }
+
+        @media (max-width: 720px) {
+            .card {
+                padding: 1.25rem;
+            }
+
+            th,
+            td {
+                font-size: 0.85rem;
+                padding: 0.6rem 0.75rem;
+            }
+
+            .table-wrapper {
+                margin-top: 1.5rem;
+            }
+        }
+
+        @media (max-width: 540px) {
+            h1 {
+                font-size: 1.85rem;
+                letter-spacing: 0.025em;
+            }
+
+            header p {
+                font-size: 0.95rem;
+            }
+
+            .controls {
+                gap: 0.75rem;
+            }
+
+            .file-input,
+            .scanner-input,
+            .toggle-btn,
+            .clear-btn,
+            .report-btn {
+                font-size: 1rem;
+                padding: 0.75rem 0.9rem;
+            }
+        }
+    </style>
+</head>
+<body>
+    <div class="app">
+        <header>
+            <h1>Barcode Checklist Manager</h1>
+            <p>Upload your manifest, scan consignments, and keep deliveries on track with quick mark-off and check-off workflows.
+            </p>
+        </header>
+
+        <section class="card" aria-label="Checklist controls">
+            <div class="controls">
+                <input type="file" id="excelFile" class="file-input" accept=".xlsx, .xls">
+                <input type="text" id="scannerInput" class="scanner-input" placeholder="Scan barcode here" disabled autofocus>
+                <div id="toggleMode" class="toggle-btn" role="button" tabindex="0">Mode: Mark Off</div>
+                <div id="clearChecklist" class="clear-btn" role="button" tabindex="0">Clear Checklist</div>
+                <div id="downloadReport" class="report-btn" role="button" tabindex="0">Download Report</div>
+            </div>
+        </section>
+
+        <div id="tableContainer" class="table-wrapper">
+            <div class="table-scroll"></div>
+        </div>
+    </div>
+
+    <!-- Load the Excel processing library -->
+    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
+    <script>
+        const excelFileInput = document.getElementById('excelFile');
+        const scannerInput = document.getElementById('scannerInput');
+        const tableContainer = document.getElementById('tableContainer');
+        const toggleModeBtn = document.getElementById('toggleMode');
+        const clearChecklistBtn = document.getElementById('clearChecklist');
+        const downloadReportBtn = document.getElementById('downloadReport');
+        let mode = 'Mark Off'; // Default mode
+        let tableData = [];
+        let generatedBarcodes = {}; // Store barcodes for each sales order
+        let scannedBoxes = {}; // Store scanned box counts for each sales order
+
+        const updateMode = () => {
+            toggleModeBtn.textContent = `Mode: ${mode}`;
+        };
+
+        const bindButton = (element, handler) => {
+            element.addEventListener('click', handler);
+            element.addEventListener('keydown', event => {
+                if (event.key === 'Enter' || event.key === ' ') {
+                    event.preventDefault();
+                    handler();
+                }
+            });
+        };
+
+        const toggleMode = () => {
+            mode = mode === 'Mark Off' ? 'Check Off' : 'Mark Off';
+            updateMode();
+        };
+
+        bindButton(toggleModeBtn, toggleMode);
+
+        excelFileInput.addEventListener('change', function(event) {
+            const file = event.target.files[0];
+            if (!file) {
+                return;
+            }
+
+            const reader = new FileReader();
+            reader.onload = function(e) {
+                const data = new Uint8Array(e.target.result);
+                const workbook = XLSX.read(data, { type: 'array' });
+                const firstSheetName = workbook.SheetNames[0];
+                const worksheet = workbook.Sheets[firstSheetName];
+                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
+                tableData = json; // Store data for matching later
+                displayTable(json);
+                generateBarcodes(json);
+                scannerInput.disabled = false; // Enable barcode input after table is displayed
+                scannerInput.focus();
+            };
+            reader.readAsArrayBuffer(file);
+        });
+
+        function displayTable(data) {
+            let table = '<div class="table-scroll"><table><thead><tr>';
+            const headers = ["Run", "Drop", "Zone", "Date", "Sales Order", "Name", "Address", "Suburb", "Postcode", "Phone Number", "FP", "CH", "FL", "Weight", "Type"];
+
+            headers.forEach(header => {
+                table += `<th>${header}</th>`;
+            });
+            table += '</tr></thead><tbody>';
+
+            data.slice(1).forEach((row, index) => {
+                table += `<tr id="row-${index}">`;
+                row.forEach(cell => {
+                    table += `<td>${cell || '-'}</td>`; // Display dash if cell is empty
+                });
+                table += '</tr>';
+            });
+            table += '</tbody></table></div>';
+            tableContainer.innerHTML = table;
+        }
+
+        function generateBarcodes(data) {
+            const salesOrderColumnIndex = 4; // Column E is the Sales Order (index 4)
+            const fpColumnIndex = 10; // Column K (index 10)
+            const chColumnIndex = 11; // Column L (index 11)
+            const flColumnIndex = 12; // Column M (index 12)
+
+            generatedBarcodes = {};
+            scannedBoxes = {};
+
+            data.slice(1).forEach(row => {
+                const salesOrder = row[salesOrderColumnIndex];
+                const fp = parseInt(row[fpColumnIndex]) || 0;
+                const ch = parseInt(row[chColumnIndex]) || 0;
+                const fl = parseInt(row[flColumnIndex]) || 0;
+
+                const totalBoxes = fp + ch + fl;
+                scannedBoxes[salesOrder] = 0; // Initialize scanned boxes for this sales order
+
+                for (let i = 1; i <= totalBoxes; i++) {
+                    const boxNumber = String(i).padStart(3, '0'); // Ensure 3-digit format
+                    const barcode = `${salesOrder}${boxNumber}`;
+                    if (!generatedBarcodes[salesOrder]) {
+                        generatedBarcodes[salesOrder] = [];
+                    }
+                    generatedBarcodes[salesOrder].push(barcode);
+                }
+            });
+        }
+
+        function handleScan(barcode) {
+            if (!barcode) {
+                return;
+            }
+
+            let matched = false;
+
+            Object.keys(generatedBarcodes).forEach(salesOrder => {
+                if (generatedBarcodes[salesOrder].includes(barcode)) {
+                    const rowIndex = tableData.findIndex(row => row[4] === salesOrder); // Column 4 is Sales Order
+                    if (rowIndex !== -1) {
+                        scannedBoxes[salesOrder] += 1; // Increment the scanned box count
+
+                        const rowElement = document.getElementById(`row-${rowIndex - 1}`);
+                        if (!rowElement) {
+                            return;
+                        }
+
+                        if (mode === 'Mark Off') {
+                            rowElement.classList.add('matched');
+                        } else if (mode === 'Check Off' && scannedBoxes[salesOrder] === generatedBarcodes[salesOrder].length) {
+                            rowElement.classList.add('completed');
+                        }
+                    }
+                    matched = true;
+                }
+            });
+
+            if (!matched) {
+                alert('Sales Order not found or barcode invalid');
+            }
+        }
+
+        scannerInput.addEventListener('keydown', function(event) {
+            if (event.key === 'Enter') {
+                handleScan(scannerInput.value.trim());
+                scannerInput.value = '';
+            }
+        });
+
+        const clearChecklist = () => {
+            const confirmed = confirm("Are you sure you want to clear the checklist?");
+            if (confirmed) {
+                tableContainer.innerHTML = '<div class="table-scroll"></div>';
+                generatedBarcodes = {};
+                scannedBoxes = {};
+                tableData = [];
+                scannerInput.value = '';
+                scannerInput.disabled = true;
+                excelFileInput.value = '';
+                localStorage.clear(); // Clear saved state if using localStorage
+            }
+        };
+        bindButton(clearChecklistBtn, clearChecklist);
+
+        const downloadReport = () => {
+            if (!tableData.length) {
+                alert('Please upload a manifest before downloading a report.');
+                return;
+            }
+
+            const completedOrders = [];
+
+            tableData.slice(1).forEach(row => {
+                const salesOrder = row[4]; // Sales Order column
+                if (generatedBarcodes[salesOrder] && scannedBoxes[salesOrder] === generatedBarcodes[salesOrder].length) {
+                    completedOrders.push(row);
+                }
+            });
+
+            if (!completedOrders.length) {
+                alert('There are no completed consignments to export yet.');
+                return;
+            }
+
+            const headers = ["Run", "Drop", "Zone", "Date", "Sales Order", "Name", "Address", "Suburb", "Postcode", "Phone Number", "FP", "CH", "FL", "Weight", "Type"];
+            let csvContent = "data:text/csv;charset=utf-8,";
+
+            csvContent += headers.join(",") + "\n";
+
+            completedOrders.forEach(row => {
+                csvContent += row.map(cell => (cell === undefined || cell === null || cell === '' ? '-' : cell)).join(",") + "\n";
+            });
+
+            const encodedUri = encodeURI(csvContent);
+            const link = document.createElement("a");
+            link.setAttribute("href", encodedUri);
+            link.setAttribute("download", "completed_consignments.csv");
+            document.body.appendChild(link);
+            link.click();
+            document.body.removeChild(link);
+        };
+
+        bindButton(downloadReportBtn, downloadReport);
+    </script>
+</body>
+</html>
