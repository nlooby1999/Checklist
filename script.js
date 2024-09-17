<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Barcode Checklist with Manifest</title>
  <style>
    /* Basic Styles for UI Enhancements */
    .loading-spinner {
      display: none;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .highlight {
      background-color: #ffeb3b;
    }
  </style>
</head>
<body>

<h1>Barcode Scanning Checklist</h1>
<input type="file" id="fileInput" aria-label="Upload Excel File">
<button id="enterButton">Enter Barcode</button>
<button id="downloadReportButton">Download Report</button>
<button id="removeChecklistButton">Clear Checklist</button>
<div class="loading-spinner" id="spinner"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.16.9/xlsx.full.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const enterButton = document.getElementById('enterButton');
    const downloadReportButton = document.getElementById('downloadReportButton');
    const removeChecklistButton = document.getElementById('removeChecklistButton');
    const spinner = document.getElementById('spinner');

    const checklistData = loadDataFromLocalStorage() || [];

    // File Upload Handler
    fileInput.addEventListener('change', handleFileUpload);

    // Barcode Scanning (Manual Input)
    enterButton.addEventListener('click', processScanInput);

    // Download Report
    downloadReportButton.addEventListener('click', downloadReport);

    // Clear Checklist
    removeChecklistButton.addEventListener('click', clearChecklistData);

    async function handleFileUpload(event) {
      try {
        spinner.style.display = 'block'; // Show spinner during file upload
        const file = event.target.files[0];
        if (!file) throw new Error('No file selected');

        const data = await readExcelFile(file);
        populateChecklist(data);
      } catch (error) {
        alert('Error processing file: ' + error.message);
      } finally {
        spinner.style.display = 'none'; // Hide spinner after processing
      }
    }

    function processScanInput() {
      const barcode = prompt('Enter barcode:');
      if (barcode.length !== 11) {
        alert('Invalid barcode length');
        return;
      }
      const match = checklistData.find(item => item['Order Number'] === barcode);
      if (match) {
        alert('Barcode found: ' + match['Customer Name']);
        updateChecklistStatus(barcode, 'scanned');
      } else {
        alert('Barcode not found in checklist');
      }
    }

    function downloadReport() {
      const fileName = prompt('Enter report name:');
      if (!fileName) return;
      exportToExcel(checklistData, fileName);
    }

    function clearChecklistData() {
      if (confirm('Are you sure you want to clear the checklist?')) {
        localStorage.removeItem('checklistData');
        alert('Checklist cleared');
      }
    }

    function loadDataFromLocalStorage() {
      return JSON.parse(localStorage.getItem('checklistData'));
    }

    function saveDataToLocalStorage(data) {
      localStorage.setItem('checklistData', JSON.stringify(data));
    }

    function readExcelFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            
            // Map columns to relevant fields as per the provided Excel structure
            const cleanedData = jsonData.map(row => ({
              ID: row['A'],
              Sequence: row[1],
              Region: row['ABX: EAST'] || row['ABX: SOUTH'], // Handle different regions
              Date: row['2024-09-16 00:00:00'],  // Map the date column appropriately
              'Order Number': row['SO209548'], // Order number mapping
              'Customer Name': row['Scott Anthony Wadeson'], // Customer name mapping
              'Address Line 1': row['20 Victoria Road'], // Address line 1
              City: row['Beechworth'], // City
              'Postal Code': row[3747], // Postal code
              'Contact Number': row[61421545900], // Contact number
              Quantity: row[2], // Quantity
              Product: row['SHEETING BOX'] // Product type
            }));

            resolve(cleanedData);
          } catch (err) {
            reject('Error reading Excel file');
          }
        };
        reader.onerror = () => reject('Error loading file');
        reader.readAsArrayBuffer(file);
      });
    }

    function populateChecklist(data) {
      checklistData.length = 0;
      data.forEach(item => {
        checklistData.push(item);
      });
      saveDataToLocalStorage(checklistData);
    }

    function updateChecklistStatus(orderNumber, status) {
      const item = checklistData.find(i => i['Order Number'] === orderNumber);
      if (item) {
        item.status = status;
        saveDataToLocalStorage(checklistData);
      }
    }

    function exportToExcel(data, fileName) {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
  });
</script>

</body>
</html>
