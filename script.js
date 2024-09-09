(() => {
    let products = [];
    let consignments = {};
    let totalProducts = 0;
    let scannedProducts = 0;
    let previewData = [];
    let runSummaries = [];
    let allPreviewData = [];
    const barcodePrefix = "SO"; // Prefix for the SO number
    const barcodeSuffixLength = 3; // Length of the suffix part
    const mainNumericPartLength = 8; // Assuming the numeric part is 8 digits
    const barcodeLength = barcodePrefix.length + mainNumericPartLength + barcodeSuffixLength; // Total length

    // Cache DOM elements
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

    // Utility functions to handle common operations
    const toggleClass = (element, className, condition) => {
        if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    };

    const validateBarcode = (scannedCode) => {
        const numericPart = scannedCode.slice(barcodePrefix.length, barcodePrefix.length + mainNumericPartLength);
        return scannedCode.startsWith(barcodePrefix) &&
               scannedCode.length === barcodeLength &&
               !isNaN(numericPart);  // Ensure that the numeric part is a valid number
    };

    const showAlert = (element, duration = 3000) => {
        element.classList.remove("hidden");
        setTimeout(() => {
            element.classList.add("hidden");
        }, duration);
    };

    const updateElementText = (element, text) => {
        element.innerText = text;
    };

    // Load data from local storage
    loadDataFromLocalStorage();

    // Delegated event listener for button clicks and input
    document.addEventListener("click", (event) => {
        if (event.target === enterButton) {
            handleScanInput();
        } else if (event.target === downloadReportButton) {
            downloadReport("report");
        } else if (event.target === removeChecklistButton) {
            clearChecklistData();
        }
    });

    // Automatically process the input when barcode length matches
    scanInput.addEventListener("input", () => {
        const scannedCode = scanInput.value.trim();
        if (scannedCode.length === barcodeLength) {
            handleScanInput();  // Automatically handle the scan when the length matches
        }
    });

    fileInput.addEventListener("change", handleFileUpload);

    function handleScanInput() {
        const scannedCode = scanInput.value.trim(); // Trim any whitespace from the input
        if (validateBarcode(scannedCode)) {
            processScanInput(scannedCode);
            scanInput.value = ""; // Clear the input field
            scanInput.focus(); // Auto focus back on the search bar
        } else {
            // Handle invalid barcode
            scanInput.classList.add("text-red-500");
            setTimeout(() => {
                scanInput.classList.remove("text-red-500");
            }, 1000);
        }
    }

    function processScanInput(scannedCode) {
        let found = false;
        toggleClass(unknownScanDiv, "hidden", true); // Hide unknown scan div by default

        previewData.forEach((row, index) => {
            if (row.productNumbers.includes(scannedCode)) {
                // If the barcode is found in the product list
                if (modeFilter.value === "scan") {
                    row.scannedNumbers.add(scannedCode);
                    if (row.scannedNumbers.size === row.productNumbers.length) {
                        const rowElement = document.querySelector(`tr[data-index="${index}"]`);
                        rowElement.children[2].classList.add("complete");
                        rowElement.children[3].classList.add("complete");
                        updateElementText(rowElement.querySelector('.status'), '✅');
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
            // If the barcode was found and processed
            scanInput.classList.add("text-green-500");
            setTimeout(() => {
                scanInput.classList.remove("text-green-500");
            }, 1000);
            checkRunCompletion();
            saveDataToLocalStorage();
        } else {
            // If the barcode was not found in the product list
            if (modeFilter.value === "mark") {
                displayPreviewData([]); // Clear the table in Mark mode if the scan is unknown
            }
            showAlert(unknownScanDiv);
            scanInput.classList.add("text-red-500");
            setTimeout(() => {
                scanInput.classList.remove("text-red-500");
            }, 1000);
        }

        if (scannedProducts === totalProducts) {
            toggleClass(runCompleteDiv, "hidden", false);
        }
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            clearChecklistData(); // Clear previous data

            let currentRun = '';
            let runSet = new Set();

            sheetData.forEach((row, index) => {
                if (row.length < 15 || !row[4]) return; // Skip rows with insufficient data or no SO Number

                const [runLetter, dropNumber, location, , soNumber, name, , , , , flatpack = 0, channelBoxCount = 0, flooringBoxCount = 0, , description] = row;
                const totalCount = flatpack + channelBoxCount + flooringBoxCount;
                const productNumbers = [];
                let suffix = 1;

                for (let i = 0; i < totalCount; i++) {
                    const productNumber = `${soNumber}${String(suffix++).padStart(barcodeSuffixLength, '0')}`;
                    products.push(productNumber);
                    productNumbers.push(productNumber);
                }

                const consignmentKey = `${runLetter}${dropNumber}${soNumber}`;
                consignments[consignmentKey] = { products: productNumbers, checked: 0, total: totalCount, flatpack, channelBoxCount, flooringBoxCount };
                totalProducts += totalCount;

                const rowData = { runLetter, dropNumber, location, soNumber, name, flatpack, channelBoxCount, flooringBoxCount, description, productNumbers, scannedNumbers: new Set(), markedOff: false };
                previewData.push(rowData);
                allPreviewData.push(rowData);
                runSet.add(runLetter);
            });

            displayPreviewData(allPreviewData);
            saveDataToLocalStorage();
        };

        reader.readAsArrayBuffer(file);
    }

    function filterByRun() {
        const selectedRun = runFilter.value;
        const filteredData = selectedRun === "all" ? allPreviewData : allPreviewData.filter(row => row.runLetter === selectedRun);
        displayPreviewData(filteredData);
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
        const previewTbody = document.querySelector('#preview-table tbody');
        previewTbody.querySelectorAll('.run-summary').forEach(row => row.remove());

        let currentRun = '';
        let currentRunTotalFlatpacks = 0;
        let currentRunTotalChannels = 0;
        let currentRunTotalFlooring = 0;

        previewData.forEach((row) => {
            const runLetter = row.runLetter;

            if (currentRun && currentRun !== runLetter) {
                appendRunSummary(previewTbody, currentRun, currentRunTotalFlatpacks, currentRunTotalChannels, currentRunTotalFlooring);
                currentRunTotalFlatpacks = currentRunTotalChannels = currentRunTotalFlooring = 0;
            }

            currentRun = runLetter;

            if (row.scannedNumbers.size === row.productNumbers.length) {
                currentRunTotalFlatpacks += row.flatpack;
                currentRunTotalChannels += row.channelBoxCount;
                currentRunTotalFlooring += row.flooringBoxCount;
            }
        });

        if (currentRun) {
            appendRunSummary(previewTbody, currentRun, currentRunTotalFlatpacks, currentRunTotalChannels, currentRunTotalFlooring);
        }

        saveDataToLocalStorage();
    }

    function appendRunSummary(previewTbody, runLetter, flatpacks, channels, flooring) {
        runSummaries.push({ runLetter, flatpacks, channels, flooring, pallets: (flatpacks + channels + flooring) * 2 });
        const summaryRow = document.createElement("tr");
        summaryRow.classList.add("run-summary");
        summaryRow.innerHTML = `<td colspan="11"><strong>Run ${runLetter}</strong> - Flatpacks: ${flatpacks}, Channels: ${channels}, Flooring: ${flooring}</td>`;
        previewTbody.appendChild(summaryRow);
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
            toggleClass(rowElement.children[2], "complete", row.scannedNumbers.size === row.productNumbers.length);
            toggleClass(rowElement.children[3], "marked-off", row.markedOff);
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

            displayPreviewData(previewData);
            checkRunCompletion();
        }
    }
})();
