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
    const downloadReportButton = document.getElementById("download-report-button");
    const removeChecklistButton = document.getElementById("remove-checklist-button");
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

            if (modeFilter.value === "mark") {
                previewTable.querySelector("tbody").innerHTML = ""; // Clear the table
            }

            previewData.forEach((row, index) => {
                if (row.productNumbers.includes(scannedCode)) {
                    if (modeFilter.value === "scan") {
                        row.scannedNumbers.add(scannedCode);
                        if (row.scannedNumbers.size === row.productNumbers.length) {
                            const rowElement = document.querySelector(`tr[data-index="${index}"]`);
                            rowElement.children[8].classList.add("complete");
                            rowElement.children[9].classList.add("complete");
                            rowElement.children[10].classList.add("complete");
                            rowElement.querySelector('.status').innerHTML = '✅';
                        }
                    } else if (modeFilter.value === "mark") {
                        row.markedOff = true;
                        displayScannedRow(row, index);
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

    function displayScannedRow(row, index) {
        const previewTbody = previewTable.querySelector("tbody");
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
            <td>${row.flatpack}</td>
            <td>${row.channelBoxCount}</td>
            <td>${row.flooringBoxCount}</td>
            <td>${row.weight}</td>
            <td>${row.description}</td>
            <td class="status">${row.scannedNumbers.size === row.productNumbers.length ? '✅' : ''}</td>
            <td class="marked-off-status">${row.markedOff ? '✅' : ''}</td>
            <td><input type="text" class="notes-input border p-1 w-full text-black" data-index="${index}" value="${row.notes}" /></td>
        `;
        if (row.markedOff) {
            rowElement.children[13].classList.add("marked-off");
        }
        previewTbody.appendChild(rowElement);
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            alert("No file selected.");
            return;
        }
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (!sheetData || sheetData.length === 0) {
                alert("Invalid or empty file.");
                return;
            }

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
            let currentRunTotalWeight = 0;
            let currentRunTotalFlatpacks = 0;
            let currentRunTotalChannels = 0;
            let currentRunTotalFlooring = 0;
            let runSet = new Set();

            sheetData.forEach((row, index) => {
                if (row.length < 15 || !row[4]) return; // Skip rows with insufficient data or no SO Number

                const runLetter = row[0];
                const dropNumber = row[1];
                const location = row[2];
                const date = formatDate(row[3]); // Format the date
                const soNumber = row[4];
                const name = row[5];
                const address = row[6];
                const suburb = row[7];
                const flatpack = row[8] || 0; // Column K
                const channelBoxCount = row[9] || 0; // Column L
                const flooringBoxCount = row[10] || 0; // Column M
                const weight = parseFloat(row[11]) || 0;
                const description = row[12];
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
                    date,
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
                    markedOff: false,
                    notes: ''
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
                        <td colspan="15"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
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
                    <td>${date}</td>
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
                    <td><input type="text" class="notes-input border p-1 w-full text-black" data-index="${index}" /></td>
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
                    <td colspan="15"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
                `;
                previewTbody.appendChild(summaryRow);
            }

            // Save data to local storage
            saveDataToLocalStorage();

            // Display preview data
            displayPreviewData(previewData);
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
                    <td colspan="15"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
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
                <td colspan="15"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
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
                rowElement.children[8].classList.add("complete");
                rowElement.children[9].classList.add("complete");
                rowElement.children[10].classList.add("complete");
            }
            if (row.markedOff) {
                rowElement.children[14].classList.add("marked-off");
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
                    <td>${row.date}</td>
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
                    <td><input type="text" class="notes-input border p-1 w-full text-black" data-index="${index}" value="${row.notes}" /></td>
                `;
                if (row.scannedNumbers.size === row.productNumbers.length) {
                    rowElement.children[8].classList.add("complete");
                    rowElement.children[9].classList.add("complete");
                    rowElement.children[10].classList.add("complete");
                }
                if (row.markedOff) {
                    rowElement.children[14].classList.add("marked-off");
                }
                previewTbody.appendChild(rowElement);
            });

            // Add event listeners to notes inputs
            document.querySelectorAll('.notes-input').forEach(input => {
                input.addEventListener('input', handleNotesInput);
            });

            checkRunCompletion();
        }
    }
});
