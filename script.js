(() => {
    const excelFileInput = document.getElementById('excelFile');
    const scannerInput = document.getElementById('scannerInput');
    const tableContainer = document.getElementById('tableContainer');
    const toggleModeBtn = document.getElementById('toggleMode');
    const clearChecklistBtn = document.getElementById('clearChecklist');
    const downloadReportBtn = document.getElementById('downloadReport');

    let mode = 'Mark Off';
    let tableData = [];
    const orderState = new Map();
    const barcodeToOrder = new Map();

    function resetState() {
        tableData = [];
        orderState.clear();
        barcodeToOrder.clear();
        tableContainer.innerHTML = '';
        scannerInput.value = '';
        scannerInput.disabled = true;
        mode = 'Mark Off';
        toggleModeBtn.textContent = 'Mode: Mark Off';
    }

    function displayTable(data) {
        const headers = [
            'Run', 'Drop', 'Zone', 'Date', 'Sales Order', 'Name', 'Address',
            'Suburb', 'Postcode', 'Phone Number', 'FP', 'CH', 'FL', 'Weight', 'Type'
        ];

        let table = '<table><thead><tr>';
        headers.forEach(header => {
            table += `<th>${header}</th>`;
        });
        table += '</tr></thead><tbody>';

        data.slice(1).forEach((row, index) => {
            table += `<tr id="row-${index}">`;
            headers.forEach((_, columnIndex) => {
                const cell = row[columnIndex];
                table += `<td>${cell !== undefined && cell !== '' ? cell : '-'}</td>`;
            });
            table += '</tr>';
        });

        table += '</tbody></table>';
        tableContainer.innerHTML = table;
    }

    function generateBarcodes(data) {
        orderState.clear();
        barcodeToOrder.clear();

        const salesOrderColumnIndex = 4;
        const fpColumnIndex = 10;
        const chColumnIndex = 11;
        const flColumnIndex = 12;

        data.slice(1).forEach((row, index) => {
            const salesOrder = row[salesOrderColumnIndex];
            if (!salesOrder) {
                return;
            }

            const fp = Number(row[fpColumnIndex]) || 0;
            const ch = Number(row[chColumnIndex]) || 0;
            const fl = Number(row[flColumnIndex]) || 0;
            const totalBoxes = fp + ch + fl;

            const entry = {
                rowIndex: index,
                totalBoxes,
                scanned: new Set(),
                barcodes: new Set()
            };

            for (let i = 1; i <= totalBoxes; i += 1) {
                const boxNumber = String(i).padStart(3, '0');
                const barcode = `${salesOrder}${boxNumber}`;
                entry.barcodes.add(barcode);
                barcodeToOrder.set(barcode, salesOrder);
            }

            orderState.set(salesOrder, entry);
        });
    }

    function updateRowHighlight(salesOrder) {
        const entry = orderState.get(salesOrder);
        if (!entry) {
            return;
        }

        const row = document.getElementById(`row-${entry.rowIndex}`);
        if (!row) {
            return;
        }

        row.classList.remove('matched', 'completed');

        if (entry.scanned.size === 0) {
            return;
        }

        if (entry.totalBoxes > 0 && entry.scanned.size === entry.totalBoxes) {
            row.classList.add('completed');
            return;
        }

        if (mode === 'Mark Off') {
            row.classList.add('matched');
        }
    }

    function applyModeStyling() {
        orderState.forEach((_, salesOrder) => updateRowHighlight(salesOrder));
    }

    function handleScan(rawBarcode) {
        const barcode = rawBarcode.trim();
        if (!barcode) {
            return;
        }

        const salesOrder = barcodeToOrder.get(barcode);
        if (!salesOrder) {
            alert('Sales Order not found or barcode invalid');
            return;
        }

        const entry = orderState.get(salesOrder);
        if (!entry) {
            alert('Sales Order not found or barcode invalid');
            return;
        }

        if (!entry.barcodes.has(barcode)) {
            alert('Sales Order not found or barcode invalid');
            return;
        }

        if (entry.scanned.has(barcode)) {
            alert('Barcode already scanned for this sales order');
            return;
        }

        entry.scanned.add(barcode);
        updateRowHighlight(salesOrder);
    }

    toggleModeBtn.addEventListener('click', () => {
        mode = mode === 'Mark Off' ? 'Check Off' : 'Mark Off';
        toggleModeBtn.textContent = `Mode: ${mode}`;
        applyModeStyling();
    });

    excelFileInput.addEventListener('change', event => {
        const [file] = event.target.files;
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const [firstSheetName] = workbook.SheetNames;
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            tableData = json;
            displayTable(json);
            generateBarcodes(json);
            applyModeStyling();
            scannerInput.disabled = false;
            scannerInput.focus();
        };
        reader.readAsArrayBuffer(file);
    });

    scannerInput.addEventListener('keydown', event => {
        if (event.key !== 'Enter') {
            return;
        }
        handleScan(scannerInput.value);
        scannerInput.value = '';
    });

    clearChecklistBtn.addEventListener('click', () => {
        const confirmed = window.confirm('Are you sure you want to clear the checklist?');
        if (!confirmed) {
            return;
        }

        resetState();
        excelFileInput.value = '';
    });

    downloadReportBtn.addEventListener('click', () => {
        if (!tableData.length) {
            alert('No data available. Please upload a manifest first.');
            return;
        }

        const headers = tableData[0];
        const completedOrders = tableData.slice(1).filter((row, index) => {
            const salesOrder = row[4];
            const entry = salesOrder ? orderState.get(salesOrder) : undefined;
            return entry && entry.totalBoxes > 0 && entry.scanned.size === entry.totalBoxes;
        });

        if (!completedOrders.length) {
            alert('There are no completed consignments to report.');
            return;
        }

        const csvRows = [headers.join(',')];
        completedOrders.forEach(row => {
            csvRows.push(row.map(cell => {
                if (cell === undefined || cell === null) {
                    return '-';
                }
                const stringValue = String(cell).replace(/"/g, '""');
                if (/[",\n]/.test(stringValue)) {
                    return `"${stringValue}"`;
                }
                return stringValue;
            }).join(','));
        });

        const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(csvBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'completed_consignments.csv';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    resetState();
})();
