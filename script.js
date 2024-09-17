let products = [];
let consignments = {};
let totalProducts = 0;
let scannedProducts = 0;
let previewData = [];
let runSummaries = [];
let allPreviewData = [];
let myChart;

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
    const chartContainer = document.getElementById("chart-container").getContext("2d");

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

    // Handle file upload and parsing of CSV file
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type === "text/csv") {
            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                const parsedData = parseCSV(text);
                processFileData(parsedData);
                updateChart(parsedData);  // Call to update chart with parsed data
            };
            reader.readAsText(file);
        } else {
            alert("Please upload a valid CSV file.");
        }
    }

    // Function to parse CSV into an array of arrays
    function parseCSV(text) {
        const rows = text.trim().split("\n");
        return rows.map(row => row.split(","));
    }

    // Process the parsed data
    function processFileData(sheetData) {
        console.log(sheetData);  // Debugging: Log the parsed sheet data

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
            const postcode = row[8];
            const phoneNumber = row[9];
            const flatpack = parseInt(row[10]) || 0; // Column K
            const channelBoxCount = parseInt(row[11]) || 0; // Column L
            const flooringBoxCount = parseInt(row[12]) || 0; // Column M
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
                    <td colspan="18"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
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
                <td>${postcode}</td>
                <td>${phoneNumber}</td>
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
                <td colspan="18"><strong>Run ${currentRun}</strong> - Total Weight: ${currentRunTotalWeight} kg, Flatpacks: ${currentRunTotalFlatpacks}, Channels: ${currentRunTotalChannels}, Flooring: ${currentRunTotalFlooring}</td>
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

        // Add event listeners to notes inputs
        document.querySelectorAll('.notes-input').forEach(input => {
            input.addEventListener('input', handleNotesInput);
        });

        // Save data to local storage
        saveDataToLocalStorage();

        // Display preview data
        displayPreviewData(previewData);
    }

    function updateChart(data) {
        const labels = data.map(row => row[4]);  // Assuming column 5 (index 4) is SO Number
        const weights = data.map(row => parseFloat(row[13]) || 0);  // Assuming column 14 (index 13) is weight

        if (myChart) myChart.destroy();  // Destroy previous chart instance if exists

        myChart = new Chart(chartContainer, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (kg)',
                    data: weights,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
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
