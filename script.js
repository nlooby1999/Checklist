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
    const runFilter = document.getElementById("run-filter");
    const modeFilter = document.getElementById("mode-filter");

    // Load data from local storage
    loadDataFromLocalStorage();

    // Handle file input change
    fileInput.addEventListener("change", handleFileUpload);

    // Handle saved report file input change
    savedReportInput.addEventListener("change", handleSavedReportUpload);

    // Handle scan input
    scanInput.addEventListener("keypress", (event) => {
        if (event.key === 'Enter') {
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

    // AI Anomaly Detection: Load the TensorFlow.js model
    async function loadModel() {
        const model = await tf.loadLayersModel('path_to_your_model/model.json');
        return model;
    }

    // Detect anomalies in the row data
    async function detectAnomalies(rowData) {
        const model = await loadModel();

        // Prepare the data as Tensor
        const inputData = tf.tensor2d([[rowData.flatpack, rowData.channelBoxCount, rowData.flooringBoxCount, rowData.weight]]);

        // Get the prediction result
        const predictions = model.predict(inputData).dataSync();

        // If the model flags it as an anomaly (-1), call the flagging function
        if (predictions[0] === -1) {
            flagAnomaly(rowData);
        }
    }

    // Mark anomaly in the UI
    function flagAnomaly(rowData) {
        const rowElement = document.querySelector(`tr[data-index="${rowData.index}"]`);
        rowElement.classList.add("anomaly-flag");
        rowElement.querySelector('.status').innerHTML = '⚠️ Anomaly Detected';
    }

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

    // Handle file upload and process the data
    function handleFileUpload(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
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

            // Populate previewData and preview table
            const previewTbody = previewTable.querySelector("tbody");
            previewTbody.innerHTML = ""; // Clear any existing preview data
            let currentRun = '';
            let currentRunTotalWeight = 0;
            let currentRunTotalFlatpacks = 0;
            let currentRunTotalChannels = 0;
            let currentRunTotalFlooring = 0;
            let runSet = new Set();

            sheetData.forEach(async (row, index) => {
                if (row.length < 15 || !row[4]) return; // Skip rows with insufficient data or no SO Number

                const rowData = {
                    runLetter: row[0],
                    dropNumber: row[1],
                    location: row[2],
                    date: formatDate(row[3]), // Format the date
                    soNumber: row[4],
                    name: row[5],
                    address: row[6],
                    suburb: row[7],
                    postcode: row[8],
                    phoneNumber: row[9],
                    flatpack: row[10] || 0,
                    channelBoxCount: row[11] || 0,
                    flooringBoxCount: row[12] || 0,
                    weight: parseFloat(row[13]) || 0,
                    description: row[14],
                    productNumbers: [],
                    scannedNumbers: new Set(),
                    markedOff: false,
                    notes: ''
                };

                let suffix = 1;
                for (let i = 0; i < rowData.flatpack; i++) {
                    rowData.productNumbers.push(`${rowData.soNumber}${String(suffix++).padStart(3, '0')}`);
                }
                for (let i = 0; i < rowData.channelBoxCount; i++) {
                    rowData.productNumbers.push(`${rowData.soNumber}${String(suffix++).padStart(3, '0')}`);
                }
                for (let i = 0; i < rowData.flooringBoxCount; i++) {
                    rowData.productNumbers.push(`${rowData.soNumber}${String(suffix++).padStart(3, '0')}`);
                }

                previewData.push(rowData);
                allPreviewData.push(rowData);
                runSet.add(rowData.runLetter);
                totalProducts += rowData.productNumbers.length;

                // Call anomaly detection for each row
                await detectAnomalies(rowData);

                const rowElement = document.createElement("tr");
                rowElement.setAttribute('data-index', index);
                rowElement.innerHTML = `
                    <td class="run-letter">${rowData.runLetter}</td>
                    <td>${rowData.dropNumber}</td>
                    <td>${rowData.location}</td>
                    <td>${rowData.date}</td>
                    <td>${rowData.soNumber}</td>
                    <td>${rowData.name}</td>
                    <td>${rowData.address}</td>
                    <td>${rowData.suburb}</td>
                    <td>${rowData.postcode}</td>
                    <td>${rowData.phoneNumber}</td>
                    <td>${rowData.flatpack}</td>
                    <td>${rowData.channelBoxCount}</td>
                    <td>${rowData.flooringBoxCount}</td>
                    <td>${rowData.weight}</td>
                    <td>${rowData.description}</td>
                    <td class="status"></td>
                    <td class="marked-off-status"></td>
                    <td><input type="text" class="notes-input border p-1 w-full text-black" data-index="${index}" /></td>
                `;
                previewTbody.appendChild(rowElement);
            });

            // Populate the run filter dropdown
            runFilter.innerHTML = '<option value="all">All</option>';
            runSet.forEach(run => {
                const option = document.createElement("option");
                option.value = run;
                option.textContent = run;
                runFilter.appendChild(option);
            });

            saveDataToLocalStorage();
            displayPreviewData(previewData);
        };

        reader.readAsArrayBuffer(file);
    }

    function handleSavedReportUpload(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            sheetData.forEach((row, index) => {
                if (index === 0 || !row[4]) return; // Skip header row and rows with no SO Number

                const soNumber = row[4];
                const flatpack = row[10] || 0;
                const channelBoxCount = row[11] || 0;
                const flooringBoxCount = row[12] || 0;
                const status = row[15];
                const markedOff = row[16] === 'true';
                const notes = row[17];

                previewData.forEach(previewRow => {
                    if (previewRow.soNumber === soNumber) {
                        previewRow.notes = notes;

                        if (status === 'Complete') {
                            previewRow.scannedNumbers = new Set(previewRow.productNumbers);
                        }

                        previewRow.markedOff = markedOff;
                        if (markedOff) {
                            const rowElement = document.querySelector(`tr[data-index="${index}"]`);
                            rowElement.children[17].classList.add("marked-off");
                            rowElement.querySelector('.marked-off-status').innerHTML = '✅';
                        }

                        if (flatpack > 0) previewRow.flatpack = flatpack;
                        if (channelBoxCount > 0) previewRow.channelBoxCount = channelBoxCount;
                        if (flooringBoxCount > 0) previewRow.flooringBoxCount = flooringBoxCount;
                    }
                });
            });

            // Update the displayed data
            displayPreviewData(previewData);
            saveDataToLocalStorage();
            checkRunCompletion();
        };

        reader.readAsArrayBuffer(file);
    }

    function formatDate(dateValue) {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? dateValue : date.toLocaleDateString();
    }

    function handleNotesInput(event) {
        const index = event.target.getAttribute('data-index');
        previewData[index].notes = event.target.value;
        saveDataToLocalStorage();
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
        let currentRunTotalWeight = 0;
        let currentRunTotalFlatpacks = 0;
        let currentRunTotalChannels = 0;
        let currentRunTotalFlooring = 0;

        previewData.forEach((row, index) => {
            const runLetter = row.runLetter;

            if (currentRun && currentRun !== runLetter) {
                runSummaries.push({
                    runLetter: currentRun,
                    totalWeight: currentRunTotalWeight,
                    flatpacks: currentRunTotalFlatpacks,
                    channels: currentRunTotalChannels,
                    flooring: currentRunTotalFlooring,
                    pallets: (currentRunTotalFlatpacks + currentRunTotalChannels + currentRunTotalFlooring) * 2
                });

                const summaryRow = document.createElement("tr");
                summaryRow.classList.add("run-summary");
                summaryRow.innerHTML = `
                    <td colspan="18"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
                `;
                previewTbody.appendChild(summaryRow);
                currentRunTotalWeight = 0;
                currentRunTotalFlatpacks = 0;
                currentRunTotalChannels = 0;
                currentRunTotalFlooring = 0;
            }

            currentRun = runLetter;

            if (row.scannedNumbers.size === row.productNumbers.length) {
                currentRunTotalFlatpacks += row.flatpack;
                currentRunTotalChannels += row.channelBoxCount;
                currentRunTotalFlooring += row.flooringBoxCount;
                currentRunTotalWeight += row.weight;
            }
        });

        if (currentRun) {
            runSummaries.push({
                runLetter: currentRun,
                totalWeight: currentRunTotalWeight,
                flatpacks: currentRunTotalFlatpacks,
                channels: currentRunTotalChannels,
                flooring: currentRunTotalFlooring,
                pallets: (currentRunTotalFlatpacks + currentRunTotalChannels + currentRunTotalFlooring) * 2
            });

            const summaryRow = document.createElement("tr");
            summaryRow.classList.add("run-summary");
            summaryRow.innerHTML = `
                <td colspan="18"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
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
                <td>${row.location}</td>
                <td>${row.date}</td>
                <td>${row.soNumber}</td>
                <td>${row.name}</td>
                <td>${row.address}</td>
                <td>${row.suburb}</td>
                <td>${row.postcode}</td>
                <td>${row.phoneNumber}</td>
                <td>${row.flatpack}</td>
                <td>${row.channelBoxCount}</td>
                <td>${row.flooringBoxCount}</td>
                <td>${row.weight}</td>
                <td>${row.description}</td>
                <td class="status">${row.scannedNumbers.size === row.productNumbers.length ? '✅' : ''}</td>
                <td class="marked-off-status">${row.markedOff ? '✅' : ''}</td>
                <td><input type="text" class="notes-input border p-1 w-full text-black" data-index="${index}" value="${row.notes}" /></td>
            `;
            if (row.scannedNumbers.size === row.productNumbers.length) {
                rowElement.children[10].classList.add("complete");
                rowElement.children[11].classList.add("complete");
                rowElement.children[12].classList.add("complete");
            }
            if (row.markedOff) {
                rowElement.children[17].classList.add("marked-off");
            }
            previewTbody.appendChild(rowElement);
        });

        // Add event listeners to notes inputs
        document.querySelectorAll('.notes-input').forEach(input => {
            input.addEventListener('input', handleNotesInput);
        });
    }

    function downloadReport(reportName) {
        const reportData = previewData.map(row => ({
            Run: row.runLetter,
            Drop: row.dropNumber,
            Location: row.location,
            Date: row.date,
            'SO Number': row.soNumber,
            Name: row.name,
            Address: row.address,
            Suburb: row.suburb,
            Postcode: row.postcode,
            'Phone Number': row.phoneNumber,
            Flatpacks: row.flatpack,
            Channel: row.channelBoxCount,
            Flooring: row.flooringBoxCount,
            Weight: row.weight,
            Description: row.description,
            Status: row.scannedNumbers.size === row.productNumbers.length ? 'Complete' : 'Incomplete',
            MarkedOff: row.markedOff ? 'true' : 'false',
            Notes: row.notes
        }));

        const summaryData = runSummaries.map(summary => ({
            Run: summary.runLetter,
            'Total Weight (kg)': summary.totalWeight,
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
        products = [];
        consignments = {};
        totalProducts = 0;
        scannedProducts = 0;
        previewData = [];
        runSummaries = [];
        allPreviewData = [];
        localStorage.removeItem('checklistData');
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
                    <td>${row.location}</td>
                    <td>${row.date}</td>
                    <td>${row.soNumber}</td>
                    <td>${row.name}</td>
                    <td>${row.address}</td>
                    <td>${row.suburb}</td>
                    <td>${row.postcode}</td>
                    <td>${row.phoneNumber}</td>
                    <td>${row.flatpack}</td>
                    <td>${row.channelBoxCount}</td>
                    <td>${row.flooringBoxCount}</td>
                    <td>${row.weight}</td>
                    <td>${row.description}</td>
                    <td class="status">${row.scannedNumbers.size === row.productNumbers.length ? '✅' : ''}</td>
                    <td class="marked-off-status">${row.markedOff ? '✅' : ''}</td>
                    <td><input type="text" class="notes-input border p-1 w-full text-black" data-index="${index}" value="${row.notes}" /></td>
                `;
                if (row.scannedNumbers.size === row.productNumbers.length) {
                    rowElement.children[10].classList.add("complete");
                    rowElement.children[11].classList.add("complete");
                    rowElement.children[12].classList.add("complete");
                }
                if (row.markedOff) {
                    rowElement.children[17].classList.add("marked-off");
                }
                previewTbody.appendChild(rowElement);
            });

            checkRunCompletion();
        }
    }
});
