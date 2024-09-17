<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consignment Tracker</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #e5e7eb; /* light gray background */
        }
        .container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background-color: #fff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
        }
        .top-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        .top-controls input,
        .top-controls button {
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 1rem;
        }
        .top-controls button {
            background-color: #007bff;
            color: white;
            border: none;
            cursor: pointer;
        }
        .top-controls button:hover {
            background-color: #0056b3;
        }
        .file-input-wrapper {
            position: relative;
            overflow: hidden;
            display: inline-block;
            margin-right: 10px;
        }
        .file-input-wrapper button {
            background-color: #6c757d;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            border: none;
        }
        .file-input-wrapper input[type="file"] {
            position: absolute;
            top: 0;
            left: 0;
            font-size: 100px;
            opacity: 0;
            cursor: pointer;
        }
        .dropdown {
            position: relative;
            display: inline-block;
        }
        .dropdown button {
            background-color: #6c757d;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 1rem;
            border: none;
            cursor: pointer;
            margin-right: 10px;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: white;
            min-width: 160px;
            box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content select {
            width: 100%;
            padding: 10px;
            font-size: 1rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
        }
        .dropdown-content select:focus {
            outline: none;
            border-color: #007bff;
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
        .hidden {
            display: none;
        }
        .complete {
            background-color: #d4edda;
        }
        .marked-off {
            background-color: #cce5ff;
        }
        .text-green-500 {
            color: #38a169;
        }
        .text-red-500 {
            color: #e53e3e;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 1rem;
        }
        th, td {
            white-space: nowrap;
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: 600;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .btn-primary {
            background-color: #007bff;
            color: white;
        }
        .btn-primary:hover {
            background-color: #0056b3;
        }
        .btn-danger {
            background-color: #dc3545;
            color: white;
        }
        .btn-danger:hover {
            background-color: #c82333;
        }
        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background-color: #5a6268;
        }
        .mode-display {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="mode-display">
            Mode: <span id="current-mode">Scan</span>
        </div>
        <div class="top-controls">
            <input type="text" id="scan-input" placeholder="Scan product code">
            <button id="enter-button" class="btn btn-primary">Enter</button>
        </div>
        <div class="flex space-x-2 mb-4">
            <button id="download-report-button" class="btn btn-primary">Download Report</button>
            <button id="remove-checklist-button" class="btn btn-danger">Remove Checklist</button>
        </div>
        <div class="bottom-controls flex">
            <div class="file-input-wrapper">
                <button>Select File</button>
                <input type="file" id="file-input">
            </div>
            <div class="dropdown">
                <button class="btn btn-secondary">Filter Run</button>
                <div class="dropdown-content">
                    <select id="run-filter">
                        <option value="all">All Runs</option>
                    </select>
                </div>
            </div>
            <div class="dropdown">
                <button class="btn btn-secondary">Filter Mode</button>
                <div class="dropdown-content">
                    <select id="mode-filter">
                        <option value="scan">Scan</option>
                        <option value="mark">Mark</option>
                        <option value="allied">Allied</option>
                    </select>
                </div>
            </div>
        </div>
        <div id="unknown-scan" class="hidden text-red-500">Unknown Scan</div>
        <div id="run-complete" class="hidden text-green-500">Run Complete</div>
        <div class="w-full overflow-x-auto">
            <table id="preview-table">
                <thead>
                    <tr>
                        <th>Run</th>
                        <th>Drop</th>
                        <th>Check</th>
                        <th>Marked</th>
                        <th>Location</th>
                        <th>SO Number</th>
                        <th>Name</th>
                        <th>Flatpacks</th>
                        <th>Channel</th>
                        <th>Flooring</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", () => {
            const scanInput = document.getElementById("scan-input");
            const enterButton = document.getElementById("enter-button");
            const fileInput = document.getElementById("file-input");
            const downloadReportButton = document.getElementById("download-report-button");
            const removeChecklistButton = document.getElementById("remove-checklist-button");
            const unknownScanDiv = document.getElementById("unknown-scan");
            const runCompleteDiv = document.getElementById("run-complete");
            const previewTable = document.getElementById("preview-table");
            const runFilter = document.getElementById("run-filter");
            const modeFilter = document.getElementById("mode-filter");
            const currentModeDisplay = document.getElementById("current-mode");

            const fullBarcodeLength = 11; // Assuming full barcode length is 11 characters

            let products = [];
            let consignments = {};
            let totalProducts = 0;
            let scannedProducts = 0;
            let previewData = [];
            let allPreviewData = [];
            let runSummaries = [];

            // Load data from local storage
            loadDataFromLocalStorage();

            // Handle file input change
            fileInput.addEventListener("change", handleFileUpload);

            // Handle scan input
            scanInput.addEventListener("input", () => {
                if (scanInput.value.length === fullBarcodeLength) {
                    const scannedCode = scanInput.value.trim();
                    processScanInput(scannedCode);
                    scanInput.value = ""; // Clear the input field
                    scanInput.focus(); // Auto focus back on the search bar
                }
            });

            // Handle Enter button click
            enterButton.addEventListener("click", () => {
                const scannedCode = scanInput.value.trim();
                processScanInput(scannedCode);
                scanInput.value = ""; // Clear the input field
                scanInput.focus(); // Auto focus back on the search bar
            });

            // Handle download report button click
            downloadReportButton.addEventListener("click", () => {
                const isComplete = confirm("Is this complete?");
                if (isComplete) {
                    const reportName = prompt("What should this report be called?", "Report");
                    if (reportName) {
                        downloadReport(reportName);
                        clearChecklistData();
                    }
                }
            });

            // Handle remove checklist button click
            removeChecklistButton.addEventListener("click", () => {
                const confirmRemove = confirm("Are you sure you want to remove the checklist?");
                if (confirmRemove) {
                    clearChecklistData();
                    alert("Checklist has been removed.");
                }
            });

            // Handle mode filter change
            modeFilter.addEventListener("change", () => {
                const selectedMode = modeFilter.value;
                currentModeDisplay.textContent = selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1);
                displayPreviewData(previewData);
            });

            // Handle run filter change
            runFilter.addEventListener("change", filterByRun);

            function processScanInput(scannedCode) {
                if (scannedCode) {
                    let found = false;
                    unknownScanDiv.classList.add("hidden");

                    previewData.forEach((row, index) => {
                        if (row.productNumbers.includes(scannedCode)) {
                            if (modeFilter.value === "scan") {
                                row.scannedNumbers.add(scannedCode);
                                if (row.scannedNumbers.size === row.productNumbers.length) {
                                    const rowElement = document.querySelector(`tr[data-index="${index}"]`);
                                    rowElement.children[2].classList.add("complete");
                                    rowElement.children[3].classList.add("complete");
                                    rowElement.querySelector('.status').innerHTML = '✅';
                                }
                            } else if (modeFilter.value === "mark") {
                                row.markedOff = true;
                                displayPreviewData([row]);
                            }
                            found = true;
                            scannedProducts++;
                        }
                    });

                    if (found) {
                        scanInput.classList.add("text-green-500");
                        setTimeout(() => {
                            scanInput.classList.remove("text-green-500");
                        }, 1000);
                        checkRunCompletion();
                        saveDataToLocalStorage();
                    } else {
                        if (modeFilter.value === "mark") {
                            displayPreviewData([]); // Clear the table in Mark mode if the scan is unknown
                        }
                        unknownScanDiv.classList.remove("hidden");
                        setTimeout(() => {
                            unknownScanDiv.classList.add("hidden");
                        }, 3000);
                        scanInput.classList.add("text-red-500");
                        setTimeout(() => {
                            scanInput.classList.remove("text-red-500");
                        }, 1000);
                    }

                    if (scannedProducts === totalProducts) {
                        runCompleteDiv.classList.remove("hidden");
                    }
                }
            }

            function handleFileUpload(event) {
                const file = event.target.files[0];
                const reader = new FileReader();

                reader.onload = (e) => {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array" });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    products = [];
                    consignments = {};
                    totalProducts = 0;
                    scannedProducts = 0;
                    previewData = [];
                    allPreviewData = [];
                    runSummaries = [];
                    runCompleteDiv.classList.add("hidden");

                    const previewTbody = previewTable.querySelector("tbody");
                    previewTbody.innerHTML = ""; // Clear any existing preview data
                    let currentRun = '';
                    let currentRunTotalFlatpacks = 0;
                    let currentRunTotalChannels = 0;
                    let currentRunTotalFlooring = 0;
                    let runSet = new Set();

                    sheetData.forEach((row, index) => {
                        if (row.length < 15 || !row[4]) return; // Skip rows with insufficient data or no SO Number

                        const runLetter = row[0];
                        const dropNumber = row[1];
                        const location = row[2];
                        const soNumber = row[4]; // Updated to column E
                        const name = row[5]; // Updated to column F
                        const flatpack = row[10] || 0; // Column K
                        const channelBoxCount = row[11] || 0; // Column L
                        const flooringBoxCount = row[12] || 0; // Column M
                        const description = row[14];
                        const totalCount = flatpack + channelBoxCount + flooringBoxCount;
                        const productNumbers = [];
                        let suffix = 1;

                        for (let i = 0; i < flatpack; i++) {
                            const productNumber = `${soNumber}${String(suffix++).padStart(3, '0')}`;
                            products.push(productNumber);
                            productNumbers.push(productNumber);
                        }

                        for (let i = 0; i < channelBoxCount; i++) {
                            const productNumber = `${soNumber}${String(suffix++).padStart(3, '0')}`;
                            products.push(productNumber);
                            productNumbers.push(productNumber);
                        }

                        for (let i = 0; i < flooringBoxCount; i++) {
                            const productNumber = `${soNumber}${String(suffix++).padStart(3, '0')}`;
                            products.push(productNumber);
                            productNumbers.push(productNumber);
                        }

                        const consignmentKey = `${runLetter}${dropNumber}${soNumber}`;
                        consignments[consignmentKey] = {
                            products: productNumbers,
                            checked: 0,
                            total: totalCount,
                            flatpack,
                            channelBoxCount,
                            flooringBoxCount
                        };

                        totalProducts += totalCount;

                        const rowData = {
                            runLetter,
                            dropNumber,
                            location,
                            soNumber,
                            name,
                            flatpack,
                            channelBoxCount,
                            flooringBoxCount,
                            description,
                            productNumbers,
                            scannedNumbers: new Set(),
                            markedOff: false
                        };

                        previewData.push(rowData);
                        allPreviewData.push(rowData);
                        runSet.add(runLetter);

                        if (currentRun && currentRun !== runLetter) {
                            runSummaries.push({
                                runLetter: currentRun,
                                flatpacks: currentRunTotalFlatpacks,
                                channels: currentRunTotalChannels,
                                flooring: currentRunTotalFlooring,
                                pallets: (currentRunTotalFlatpacks + currentRunTotalChannels + currentRunTotalFlooring) * 2
                            });

                            const summaryRow = document.createElement("tr");
                            summaryRow.classList.add("run-summary");
                            summaryRow.innerHTML = `
                                <td colspan="11"><strong>Run ${currentRun}</strong> - Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
                            `;
                            previewTbody.appendChild(summaryRow);
                            currentRunTotalFlatpacks = 0;
                            currentRunTotalChannels = 0;
                            currentRunTotalFlooring = 0;
                        }

                        currentRun = runLetter;

                        if (flatpack > 0) currentRunTotalFlatpacks += flatpack;
                        if (channelBoxCount > 0) currentRunTotalChannels += channelBoxCount;
                        if (flooringBoxCount > 0) currentRunTotalFlooring += flooringBoxCount;

                        const rowElement = document.createElement("tr");
                        rowElement.setAttribute('data-index', index);
                        rowElement.innerHTML = `
                            <td class="run-letter">${runLetter}</td>
                            <td>${dropNumber}</td>
                            <td class="status"></td>
                            <td class="marked-off-status"></td>
                            <td>${location}</td>
                            <td>${soNumber}</td>
                            <td>${name}</td>
                            <td>${flatpack}</td>
                            <td>${channelBoxCount}</td>
                            <td>${flooringBoxCount}</td>
                            <td>${description}</td>
                        `;
                        previewTbody.appendChild(rowElement);
                    });

                    // Add final summary row for the last run
                    if (currentRun) {
                        runSummaries.push({
                            runLetter: currentRun,
                            flatpacks: currentRunTotalFlatpacks,
                            channels: currentRunTotalChannels,
                            flooring: currentRunTotalFlooring,
                            pallets: (currentRunTotalFlatpacks + currentRunTotalChannels + currentRunTotalFlooring) * 2
                        });

                        const summaryRow = document.createElement("tr");
                        summaryRow.classList.add("run-summary");
                        summaryRow.innerHTML = `
                            <td colspan="11"><strong>Run ${currentRun}</strong> - Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
                        `;
                        previewTbody.appendChild(summaryRow);
                    }

                    // Populate the run filter dropdown
                    runFilter.innerHTML = '<option value="all">All Runs</option>'; // Reset options and include 'All Runs'
                    runSet.forEach(run => {
                        const option = document.createElement("option");
                        option.value = run;
                        option.textContent = run;
                        runFilter.appendChild(option);
                    });

                    // Save data to local storage
                    saveDataToLocalStorage();

                    // Display preview data
                    displayPreviewData(previewData);
                };

                reader.readAsArrayBuffer(file);
            }

            function filterByRun() {
                const selectedRun = runFilter.value;
                if (selectedRun === "all") {
                    displayPreviewData(allPreviewData);
                } else {
                    const filteredData = allPreviewData.filter(row => row.runLetter === selectedRun);
                    displayPreviewData(filteredData);
                }
            }

            function checkRunCompletion() {
                const runLetters = [...new Set(previewData.map(row => row.runLetter))];
                runLetters.forEach(runLetter => {
                    const runRows = previewData.filter(row => row.runLetter === runLetter);
                    const allScanned = runRows.every(row => row.scannedNumbers.size === row.productNumbers.length);
                    if (allScanned) {
                        document.querySelectorAll(`.run-letter`).forEach(element => {
                            if (element.textContent === runLetter) {
                                element.classList.add("complete");
                            }
                        });
                    }
                });

                updateSummary();
            }

            function updateSummary() {
                const summaryRows = document.querySelectorAll('.run-summary');
                summaryRows.forEach(row => row.remove());

                const previewTbody = document.querySelector('#preview-table tbody');
                let currentRun = '';
                let currentRunTotalFlatpacks = 0;
                let currentRunTotalChannels = 0;
                let currentRunTotalFlooring = 0;

                previewData.forEach((row, index) => {
                    const runLetter = row.runLetter;

                    if (currentRun && currentRun !== runLetter) {
                        runSummaries.push({
                            runLetter: currentRun,
                            flatpacks: currentRunTotalFlatpacks,
                            channels: currentRunTotalChannels,
                            flooring: currentRunTotalFlooring,
                            pallets: (currentRunTotalFlatpacks + currentRunTotalChannels + currentRunTotalFlooring) * 2
                        });

                        const summaryRow = document.createElement("tr");
                        summaryRow.classList.add("run-summary");
                        summaryRow.innerHTML = `
                            <td colspan="11"><strong>Run ${currentRun}</strong> - Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
                        `;
                        previewTbody.appendChild(summaryRow);
                        currentRunTotalFlatpacks = 0;
                        currentRunTotalChannels = 0;
                        currentRunTotalFlooring = 0;
                    }

                    currentRun = runLetter;

                    if (row.scannedNumbers.size === row.productNumbers.length) {
                        currentRunTotalFlatpacks += row.flatpack;
                        currentRunTotalChannels += row.channelBoxCount;
                        currentRunTotalFlooring += row.flooringBoxCount;
                    }
                });

                if (currentRun) {
                    runSummaries.push({
                        runLetter: currentRun,
                        flatpacks: currentRunTotalFlatpacks,
                        channels: currentRunTotalChannels,
                        flooring: currentRunTotalFlooring,
                        pallets: (currentRunTotalFlatpacks + currentRunTotalChannels + currentRunTotalFlooring) * 2
                    });

                    const summaryRow = document.createElement("tr");
                    summaryRow.classList.add("run-summary");
                    summaryRow.innerHTML = `
                        <td colspan="11"><strong>Run ${currentRun}</strong> - Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
                    `;
                    previewTbody.appendChild(summaryRow);
                }

                // Save updated data to local storage
                saveDataToLocalStorage();
            }

            function displayPreviewData(data) {
                const previewTbody = previewTable.querySelector("tbody");
                previewTbody.innerHTML = ""; // Clear existing preview data

                data.forEach((row, index) => {
                    const rowElement = document.createElement("tr");
                    rowElement.setAttribute('data-index', index);
                    rowElement.innerHTML = `
                        <td class="run-letter">${row.runLetter}</td>
                        <td>${row.dropNumber}</td>
                        <td class="status">${row.scannedNumbers.size === row.productNumbers.length ? '✅' : ''}</td>
                        <td class="marked-off-status">${row.markedOff ? '✅' : ''}</td>
                        <td>${row.location}</td>
                        <td>${row.soNumber}</td>
                        <td>${row.name}</td>
                        <td>${row.flatpack}</td>
                        <td>${row.channelBoxCount}</td>
                        <td>${row.flooringBoxCount}</td>
                        <td>${row.description}</td>
                    `;
                    if (row.scannedNumbers.size === row.productNumbers.length) {
                        rowElement.children[2].classList.add("complete");
                        rowElement.children[3].classList.add("complete");
                    }
                    if (row.markedOff) {
                        rowElement.children[3].classList.add("marked-off");
                    }
                    previewTbody.appendChild(rowElement);
                });
            }

            function downloadReport(reportName) {
                const reportData = previewData.map(row => ({
                    Run: row.runLetter,
                    Drop: row.dropNumber,
                    Check: row.scannedNumbers.size === row.productNumbers.length ? 'Complete' : 'Incomplete',
                    Marked: row.markedOff ? 'true' : 'false',
                    Location: row.location,
                    'SO Number': row.soNumber,
                    Name: row.name,
                    Flatpacks: row.flatpack,
                    Channel: row.channelBoxCount,
                    Flooring: row.flooringBoxCount,
                    Description: row.description
                }));

                const summaryData = runSummaries.map(summary => ({
                    Run: summary.runLetter,
                    Flatpacks: summary.flatpacks,
                    Channels: summary.channels,
                    Flooring: summary.flooring,
                    Pallets: summary.pallets,
                    Notes: summary.notes || ''
                }));

                const now = new Date();
                const timestamp = now.toLocaleString();

                const worksheet = XLSX.utils.json_to_sheet(reportData);
                const summarySheet = XLSX.utils.json_to_sheet(summaryData);
                XLSX.utils.sheet_add_aoa(summarySheet, [['Report generated on:', timestamp]], { origin: -1 });
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
                XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
                XLSX.writeFile(workbook, `${reportName}_${now.toISOString().split('T')[0]}.xlsx`);
            }

            function clearChecklistData() {
                // Clear data arrays
                products = [];
                consignments = {};
                totalProducts = 0;
                scannedProducts = 0;
                previewData = [];
                runSummaries = [];
                allPreviewData = [];

                // Clear local storage
                localStorage.removeItem('checklistData');

                // Clear the preview table
                const previewTbody = previewTable.querySelector("tbody");
                previewTbody.innerHTML = "";
            }

            function saveDataToLocalStorage() {
                const data = {
                    products,
                    consignments,
                    totalProducts,
                    scannedProducts,
                    previewData,
                    runSummaries,
                    allPreviewData
                };
                localStorage.setItem('checklistData', JSON.stringify(data));
            }

            function loadDataFromLocalStorage() {
                const data = JSON.parse(localStorage.getItem('checklistData'));
                if (data) {
                    products = data.products;
                    consignments = data.consignments;
                    totalProducts = data.totalProducts;
                    scannedProducts = data.scannedProducts;
                    previewData = data.previewData;
                    runSummaries = data.runSummaries;
                    allPreviewData = data.allPreviewData;

                    const previewTbody = previewTable.querySelector("tbody");
                    previewTbody.innerHTML = ""; // Clear any existing preview data

                    previewData.forEach((row, index) => {
                        const rowElement = document.createElement("tr");
                        rowElement.setAttribute('data-index', index);
                        rowElement.innerHTML = `
                            <td class="run-letter">${row.runLetter}</td>
                            <td>${row.dropNumber}</td>
                            <td class="status">${row.scannedNumbers.size === row.productNumbers.length ? '✅' : ''}</td>
                            <td class="marked-off-status">${row.markedOff ? '✅' : ''}</td>
                            <td>${row.location}</td>
                            <td>${row.soNumber}</td>
                            <td>${row.name}</td>
                            <td>${row.flatpack}</td>
                            <td>${row.channelBoxCount}</td>
                            <td>${row.flooringBoxCount}</td>
                            <td>${row.description}</td>
                        `;
                        if (row.scannedNumbers.size === row.productNumbers.length) {
                            rowElement.children[2].classList.add("complete");
                            rowElement.children[3].classList.add("complete");
                        }
                        if (row.markedOff) {
                            rowElement.children[3].classList.add("marked-off");
                        }
                        previewTbody.appendChild(rowElement);
                    });

                    checkRunCompletion();
                }
            }
        });
    </script>
</body>
</html>
