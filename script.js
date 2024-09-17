document.addEventListener("DOMContentLoaded", () => {
    let products = [];
    let consignments = {};
    let totalProducts = 0;
    let scannedProducts = 0;
    let previewData = [];
    let runSummaries = [];
    let allPreviewData = [];
    let zoomLevel = 1;

    const scanInput = document.getElementById("scan-input");
    const fileInput = document.getElementById("file-input");
    const savedReportInput = document.getElementById("saved-report-input");
    const downloadReportButton = document.getElementById("download-report-button");
    const unknownScanDiv = document.getElementById("unknown-scan");
    const runCompleteDiv = document.getElementById("run-complete");
    const previewTable = document.getElementById("preview-table");
    const zoomInButton = document.getElementById("zoom-in");
    const zoomOutButton = document.getElementById("zoom-out");
    const runFilter = document.getElementById("run-filter");
    const modeFilter = document.getElementById("mode-filter");

    // Load data from local storage on load
    loadDataFromLocalStorage();

    // Event listeners for file input and scan input
    fileInput.addEventListener("change", handleFileUpload);
    scanInput.addEventListener("keypress", (event) => {
        if (event.key === 'Enter') {
            processScanInput(scanInput.value.trim());
            scanInput.value = "";
        }
    });

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

    modeFilter.addEventListener("change", () => {
        displayPreviewData(previewData);
    });

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

    // Handle scan input processing
    function processScanInput(scannedCode) {
        if (!scannedCode) return;
        
        let found = false;
        unknownScanDiv.classList.add("hidden");

        previewData.forEach((row, index) => {
            if (row.productNumbers.includes(scannedCode)) {
                if (modeFilter.value === "scan") {
                    row.scannedNumbers.add(scannedCode);
                    if (row.scannedNumbers.size === row.productNumbers.length) {
                        markRowComplete(index);
                    }
                } else if (modeFilter.value === "mark") {
                    row.markedOff = true;
                    markRowAsMarkedOff(index);
                }
                found = true;
                scannedProducts++;
            }
        });

        if (found) {
            feedbackSuccess(scanInput);
            checkRunCompletion();
            saveDataToLocalStorage();
        } else {
            feedbackError(scanInput, unknownScanDiv);
        }

        if (scannedProducts === totalProducts) {
            runCompleteDiv.classList.remove("hidden");
        }
    }

    // Handle file upload and parsing
    function handleFileUpload(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            resetChecklistData();
            parseSheetData(sheetData);
        };

        reader.readAsArrayBuffer(file);
    }

    // Parse sheet data and populate table
    function parseSheetData(sheetData) {
        const previewTbody = previewTable.querySelector("tbody");
        previewTbody.innerHTML = ""; // Clear existing preview data
        let currentRun = '';
        let currentRunTotalWeight = 0;
        let currentRunTotalFlatpacks = 0;
        let currentRunTotalChannels = 0;
        let currentRunTotalFlooring = 0;
        let runSet = new Set();

        sheetData.forEach((row, index) => {
            if (row.length < 15 || !row[4]) return; // Skip rows with insufficient data or no SO Number

            const rowData = extractRowData(row);
            products.push(...rowData.productNumbers);
            previewData.push(rowData);
            allPreviewData.push(rowData);
            runSet.add(rowData.runLetter);

            totalProducts += rowData.totalCount;

            if (currentRun && currentRun !== rowData.runLetter) {
                addRunSummary(currentRun, currentRunTotalWeight, currentRunTotalFlatpacks, currentRunTotalChannels, currentRunTotalFlooring);
                currentRunTotalWeight = currentRunTotalFlatpacks = currentRunTotalChannels = currentRunTotalFlooring = 0;
            }

            currentRun = rowData.runLetter;
            currentRunTotalFlatpacks += rowData.flatpack;
            currentRunTotalChannels += rowData.channelBoxCount;
            currentRunTotalFlooring += rowData.flooringBoxCount;
            currentRunTotalWeight += rowData.weight;

            appendRowToTable(rowData, index);
        });

        if (currentRun) {
            addRunSummary(currentRun, currentRunTotalWeight, currentRunTotalFlatpacks, currentRunTotalChannels, currentRunTotalFlooring);
        }

        populateRunFilter(runSet);
        saveDataToLocalStorage();
        displayPreviewData(previewData);
    }

    // Extract relevant data from a row
    function extractRowData(row) {
        const runLetter = row[0];
        const dropNumber = row[1];
        const location = row[2];
        const date = formatDate(row[3]);
        const soNumber = row[4];
        const name = row[5];
        const address = row[6];
        const suburb = row[7];
        const postcode = row[8];
        const phoneNumber = row[9];
        const flatpack = row[10] || 0;
        const channelBoxCount = row[11] || 0;
        const flooringBoxCount = row[12] || 0;
        const weight = parseFloat(row[13]) || 0;
        const description = row[14];
        const totalCount = flatpack + channelBoxCount + flooringBoxCount;
        const productNumbers = generateProductNumbers(soNumber, flatpack, channelBoxCount, flooringBoxCount);

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

        return {
            runLetter,
            dropNumber,
            location,
            date,
            soNumber,
            name,
            address,
            suburb,
            postcode,
            phoneNumber,
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
    }

    // Generate product numbers based on SO number
    function generateProductNumbers(soNumber, flatpack, channelBoxCount, flooringBoxCount) {
        const productNumbers = [];
        let suffix = 1;

        for (let i = 0; i < flatpack; i++) {
            productNumbers.push(`${soNumber}${String(suffix++).padStart(3, '0')}`);
        }
        for (let i = 0; i < channelBoxCount; i++) {
            productNumbers.push(`${soNumber}${String(suffix++).padStart(3, '0')}`);
        }
        for (let i = 0; i < flooringBoxCount; i++) {
            productNumbers.push(`${soNumber}${String(suffix++).padStart(3, '0')}`);
        }

        return productNumbers;
    }

    // Append row to the preview table
    function appendRowToTable(rowData, index) {
        const previewTbody = previewTable.querySelector("tbody");
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
    }

    // Add run summary row
    function addRunSummary(runLetter, totalWeight, flatpacks, channels, flooring) {
        runSummaries.push({
            runLetter,
            totalWeight,
            flatpacks,
            channels,
            flooring,
            pallets: (flatpacks + channels + flooring) * 2
        });

        const previewTbody = previewTable.querySelector("tbody");
        const summaryRow = document.createElement("tr");
        summaryRow.classList.add("run-summary");
        summaryRow.innerHTML = `
            <td colspan="18"><strong>Run ${runLetter}</strong> - Total Weight: ${totalWeight} kg, Flatpacks: ${flatpacks}, Channels: ${channels}, Flooring: ${flooring}</td>
        `;
        previewTbody.appendChild(summaryRow);
    }

    // Utility Functions
    function markRowComplete(index) {
        const rowElement = document.querySelector(`tr[data-index="${index}"]`);
        rowElement.querySelector('.status').innerHTML = '✅';
        rowElement.children[10].classList.add("complete");
        rowElement.children[11].classList.add("complete");
        rowElement.children[12].classList.add("complete");
    }

    function markRowAsMarkedOff(index) {
        const rowElement = document.querySelector(`tr[data-index="${index}"]`);
        rowElement.querySelector('.marked-off-status').innerHTML = '✅';
        rowElement.children[17].classList.add("marked-off");
    }

    function feedbackSuccess(input) {
        input.classList.add("text-green-500");
        setTimeout(() => input.classList.remove("text-green-500"), 1000);
    }

    function feedbackError(input, errorDiv) {
        errorDiv.classList.remove("hidden");
        setTimeout(() => errorDiv.classList.add("hidden"), 3000);
        input.classList.add("text-red-500");
        setTimeout(() => input.classList.remove("text-red-500"), 1000);
    }

    function formatDate(dateValue) {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? dateValue : date.toLocaleDateString();
    }

    function populateRunFilter(runSet) {
        runFilter.innerHTML = '<option value="all">All</option>';
        runSet.forEach(run => {
            const option = document.createElement("option");
            option.value = run;
            option.textContent = run;
            runFilter.appendChild(option);
        });
    }

    // Data persistence and management
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

            displayPreviewData(previewData);
            checkRunCompletion();
        }
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
        let currentRun = '';
        let currentRunTotalWeight = 0;
        let currentRunTotalFlatpacks = 0;
        let currentRunTotalChannels = 0;
        let currentRunTotalFlooring = 0;

        previewData.forEach((row) => {
            if (currentRun && currentRun !== row.runLetter) {
                addRunSummary(currentRun, currentRunTotalWeight, currentRunTotalFlatpacks, currentRunTotalChannels, currentRunTotalFlooring);
                currentRunTotalWeight = currentRunTotalFlatpacks = currentRunTotalChannels = currentRunTotalFlooring = 0;
            }

            currentRun = row.runLetter;

            if (row.scannedNumbers.size === row.productNumbers.length) {
                currentRunTotalFlatpacks += row.flatpack;
                currentRunTotalChannels += row.channelBoxCount;
                currentRunTotalFlooring += row.flooringBoxCount;
                currentRunTotalWeight += row.weight;
            }
        });

        if (currentRun) {
            addRunSummary(currentRun, currentRunTotalWeight, currentRunTotalFlatpacks, currentRunTotalChannels, currentRunTotalFlooring);
        }
        saveDataToLocalStorage();
    }

    function displayPreviewData(data) {
        const previewTbody = previewTable.querySelector("tbody");
        previewTbody.innerHTML = ""; // Clear existing preview data

        data.forEach((row, index) => {
            appendRowToTable(row, index);
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
            Pallets: summary.pallets
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
});
