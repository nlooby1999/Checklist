let products = [];
let consignments = {};
let totalProducts = 0;
let scannedProducts = 0;
let previewData = [];
let runSummaries = [];
let allPreviewData = [];

document.addEventListener("DOMContentLoaded", () => {
    const scanInput = document.getElementById("scan-input");
    const fileInput = document.getElementById("file-input");
    const downloadReportButton = document.getElementById("download-report-button");
    const removeChecklistButton = document.getElementById("remove-checklist-button");
    const unknownScanDiv = document.getElementById("unknown-scan");
    const runCompleteDiv = document.getElementById("run-complete");
    const previewTable = document.getElementById("preview-table");
    const runFilter = document.getElementById("run-filter");
    const modeFilter = document.getElementById("mode-filter");

    // Load data from local storage
    loadDataFromLocalStorage();

    // Handle file input change
    fileInput.addEventListener("change", handleFileUpload);

    // Handle scan input
    scanInput.addEventListener("keypress", (event) => {
        if (event.key === 'Enter') {
            const scannedCode = scanInput.value.trim();
            processScanInput(scannedCode);
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
        displayPreviewData(previewData);
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
                            rowElement.children[7].classList.add("complete");
                            rowElement.children[8].classList.add("complete");
                            rowElement.children[9].classList.add("complete");
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

            scanInput.focus(); // Auto focus back on the search bar
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

            console.log(sheetData);  // Debugging: Log the parsed sheet data

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

            sheetData.forEach((row, index) => {
                if (row.length < 12 || !row[4]) return; // Skip rows with insufficient data or no SO Number

                const runLetter = row[0];
                const dropNumber = row[1];
                const location = row[2];
                const soNumber = row[4];
                const name = row[5];
                const address = row[6];
                const suburb = row[7];
                const flatpack = row[10] || 0; // Column K
                const channelBoxCount = row[11] || 0; // Column L
                const flooringBoxCount = row[12] || 0; // Column M
                const weight = parseFloat(row[13]) || 0;
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
                    weight,
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
                    address,
                    suburb,
                    flatpack,
                    channelBoxCount,
                    flooringBoxCount,
                    weight,
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
                        totalWeight: currentRunTotalWeight,
                        flatpacks: currentRunTotalFlatpacks,
                        channels: currentRunTotalChannels,
                        flooring: currentRunTotalFlooring,
                        pallets: (currentRunTotalFlatpacks + currentRunTotalChannels + currentRunTotalFlooring) * 2
                    });

                    const summaryRow = document.createElement("tr");
                    summaryRow.classList.add("run-summary");
                    summaryRow.innerHTML = `
                        <td colspan="14"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
                    `;
                    previewTbody.appendChild(summaryRow);
                    currentRunTotalWeight = 0;
                    currentRunTotalFlatpacks = 0;
                    currentRunTotalChannels = 0;
                    currentRunTotalFlooring = 0;
                }

                currentRun = runLetter;

                if (flatpack > 0) currentRunTotalFlatpacks += flatpack;
                if (channelBoxCount > 0) currentRunTotalChannels += channelBoxCount;
                if (flooringBoxCount > 0) currentRunTotalFlooring += flooringBoxCount;
                currentRunTotalWeight += weight;

                const rowElement = document.createElement("tr");
                rowElement.setAttribute('data-index', index);
                rowElement.innerHTML = `
                    <td class="run-letter">${runLetter}</td>
                    <td>${dropNumber}</td>
                    <td>${location}</td>
                    <td>${soNumber}</td>
                    <td>${name}</td>
                    <td>${address}</td>
                    <td>${suburb}</td>
                    <td>${flatpack}</td>
                    <td>${channelBoxCount}</td>
                    <td>${flooringBoxCount}</td>
                    <td>${weight}</td>
                    <td>${description}</td>
                    <td class="status"></td>
                    <td class="marked-off-status"></td>
                `;
                previewTbody.appendChild(rowElement);
            });

            // Add final summary row for the last run
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
                    <td colspan="14"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
                `;
                previewTbody.appendChild(summaryRow);
            }

            // Populate the run filter dropdown
            runFilter.innerHTML = '<option value="all">All</option>';
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

    function handleSavedReportUpload(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            console.log(sheetData); // Debugging: Log the parsed sheet data

            sheetData.forEach((row, index) => {
                if (index === 0 || !row[4]) return; // Skip header row and rows with no SO Number

                const soNumber = row[4];
                const flatpack = row[10] || 0;
                const channelBoxCount = row[11] || 0;
                const flooringBoxCount = row[12] || 0;
                const status = row[15];
                const markedOff = row[16] === 'true';

                previewData.forEach(previewRow => {
                    if (previewRow.soNumber === soNumber) {
                        if (status === 'Complete') {
                            previewRow.scannedNumbers = new Set(previewRow.productNumbers);
                        }

                        previewRow.markedOff = markedOff;
                        if (markedOff) {
                            const rowElement = document.querySelector(`tr[data-index="${index}"]`);
                            rowElement.children[13].classList.add("marked-off");
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
                    <td colspan="14"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
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
                <td colspan="14"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
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
                <td>${row.soNumber}</td>
                <td>${row.name}</td>
                <td>${row.address}</td>
                <td>${row.suburb}</td>
                <td>${row.flatpack}</td>
                <td>${row.channelBoxCount}</td>
                <td>${row.flooringBoxCount}</td>
                <td>${row.weight}</td>
                <td>${row.description}</td>
                <td class="status">${row.scannedNumbers.size === row.productNumbers.length ? '✅' : ''}</td>
                <td class="marked-off-status">${row.markedOff ? '✅' : ''}</td>
            `;
            if (row.scannedNumbers.size === row.productNumbers.length) {
                rowElement.children[7].classList.add("complete");
                rowElement.children[8].classList.add("complete");
                rowElement.children[9].classList.add("complete");
            }
            if (row.markedOff) {
                rowElement.children[13].classList.add("marked-off");
            }
            previewTbody.appendChild(rowElement);
        });
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

    function downloadReport(reportName) {
        const reportData = previewData.map(row => ({
            Run: row.runLetter,
            Drop: row.dropNumber,
            Location: row.location,
            'SO Number': row.soNumber,
            Name: row.name,
            Address: row.address,
            Suburb: row.suburb,
            Flatpacks: row.flatpack,
            Channel: row.channelBoxCount,
            Flooring: row.flooringBoxCount,
            Weight: row.weight,
            Description: row.description,
            Status: row.scannedNumbers.size === row.productNumbers.length ? 'Complete' : 'Incomplete',
            MarkedOff: row.markedOff ? 'true' : 'false'
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
                    <td>${row.location}</td>
                    <td>${row.soNumber}</td>
                    <td>${row.name}</td>
                    <td>${row.address}</td>
                    <td>${row.suburb}</td>
                    <td>${row.flatpack}</td>
                    <td>${row.channelBoxCount}</td>
                    <td>${row.flooringBoxCount}</td>
                    <td>${row.weight}</td>
                    <td>${row.description}</td>
                    <td class="status">${row.scannedNumbers.size === row.productNumbers.length ? '✅' : ''}</td>
                    <td class="marked-off-status">${row.markedOff ? '✅' : ''}</td>
                `;
                if (row.scannedNumbers.size === row.productNumbers.length) {
                    rowElement.children[7].classList.add("complete");
                    rowElement.children[8].classList.add("complete");
                    rowElement.children[9].classList.add("complete");
                }
                if (row.markedOff) {
                    rowElement.children[13].classList.add("marked-off");
                }
                previewTbody.appendChild(rowElement);
            });

            checkRunCompletion();
        }
    }
});
