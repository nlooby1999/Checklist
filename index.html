<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Checklist</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        .container {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        .status-column {
            width: 200px;
        }
        .run-complete {
            font-size: 1.5rem;
            font-weight: bold;
            color: green;
        }
        .preview-table {
            width: 100%;
            margin-bottom: 1rem;
            overflow-x: auto;
            white-space: nowrap;
        }
        .preview-table th, .preview-table td {
            padding: 0.5rem;
            text-align: left;
            word-break: keep-all;
        }
        .preview-table th {
            background-color: #333;
            color: white;
        }
        .preview-table td {
            background-color: #555;
            color: white;
        }
        .complete {
            text-decoration: line-through;
            color: #00FF00; /* Green color */
        }
        .marked-off {
            background-color: #FFA500; /* Orange color */
        }
        .unknown-scan {
            font-size: 1.25rem;
            font-weight: bold;
            color: red;
        }
    </style>
</head>
<body class="bg-gray-800 text-white p-4">
    <div class="container mx-auto">
        <div>
            <h1 class="text-2xl font-bold mb-4">Product Checklist</h1>
            <div class="flex gap-2 mb-4">
                <input type="file" id="file-input" class="text-black p-2">
                <input type="file" id="saved-report-input" class="text-black p-2">
            </div>
            <div class="flex gap-2 mb-4">
                <select id="mode-filter" class="border p-2 text-black">
                    <option value="scan">Scan Mode</option>
                    <option value="mark">Mark Off Mode</option>
                </select>
                <input type="text" id="scan-input" class="border p-4 w-full text-black" placeholder="Scan product or SO number..." autofocus>
            </div>
            <div id="unknown-scan" class="unknown-scan hidden">Unknown Scan</div>
            <div class="overflow-x-auto">
                <table id="preview-table" class="preview-table">
                    <thead>
                        <tr>
                            <th>Run</th>
                            <th>Drop</th>
                            <th>Location</th>
                            <th>Date</th>
                            <th>SO Number</th>
                            <th>Name</th>
                            <th>Address</th>
                            <th>Suburb</th>
                            <th>Postcode</th>
                            <th>Phone Number</th>
                            <th>Flatpack</th>
                            <th>Channel Box</th>
                            <th>Flooring Box</th>
                            <th>Weight</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Marked Off</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Preview data will be dynamically added here -->
                    </tbody>
                </table>
            </div>
            <div class="flex flex-wrap gap-2 mt-4">
                <button id="download-report-button" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4">Download Report</button>
                <button id="zoom-in" class="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4">Zoom In</button>
                <button id="zoom-out" class="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4">Zoom Out</button>
            </div>
        </div>
    </div>
    <div id="run-complete" class="run-complete text-center hidden">
        Run Complete
    </div>
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script>
        let products = [];
        let consignments = {};
        let totalProducts = 0;
        let scannedProducts = 0;
        let previewData = [];
        let runSummaries = [];
        let allPreviewData = [];
        let zoomLevel = 1;

        document.addEventListener("DOMContentLoaded", () => {
            const scanInput = document.getElementById("scan-input");
            const fileInput = document.getElementById("file-input");
            const savedReportInput = document.getElementById("saved-report-input");
            const downloadReportButton = document.getElementById("download-report-button");
            const unknownScanDiv = document.getElementById("unknown-scan");
            const runCompleteDiv = document.getElementById("run-complete");
            const previewTable = document.getElementById("preview-table");
            const zoomInButton = document.getElementById("zoom-in");
            const zoomOutButton = document.getElementById("zoom-out");
            const modeFilter = document.getElementById("mode-filter");

            // Load data from local storage
            loadDataFromLocalStorage();

            // Handle file input change
            fileInput.addEventListener("change", handleFileUpload);

            // Handle saved report file input change
            savedReportInput.addEventListener("change", handleSavedReportUpload);

            // Handle scan input
            scanInput.addEventListener("input", () => {
                if (scanInput.value.length === 11) {
                    processScanInput(scanInput.value.trim());
                    scanInput.value = "";
                }
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

            // Handle mode filter change
            modeFilter.addEventListener("change", () => {
                displayPreviewData(previewData);
            });

            // Zoom in and zoom out functionality
            zoomInButton.addEventListener("click", () => {
                zoomLevel += 0.1;
                previewTable.style.transform = `scale(${zoomLevel})`;
            });

            zoomOutButton.addEventListener("click", () => {
                if (zoomLevel > 0.2) {
                    zoomLevel -= 0.1;
                    previewTable.style.transform = `scale(${zoomLevel})`;
                }
            });

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
                                    rowElement.children[10].classList.add("complete");
                                    rowElement.children[11].classList.add("complete");
                                    rowElement.children[12].classList.add("complete");
                                    rowElement.querySelector('.status').innerHTML = '✅';
                                }
                            } else if (modeFilter.value === "mark") {
                                row.markedOff = true;
                                const rowElement = document.querySelector(`tr[data-index="${index}"]`);
                                rowElement.children[17].classList.add("marked-off");
                                rowElement.querySelector('.marked-off-status').innerHTML = '✅';
                                displayPreviewData(previewData);
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
