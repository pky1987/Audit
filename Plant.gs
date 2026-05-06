// ============================================================
// Code.gs – Plant Wishlist (OpenRouter, no dropdowns, no nulls)
// ============================================================

const OPENROUTER_API_KEY = '';  
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = 'https://script.google.com/macros/s/AKfycbyaeZ14q4Mm8e-1bW7iA-3Ka9D3Wbzc2kOjKxfM_qZErrxS3_qdJcYYu9ZRAbDzPT0p/exec';            // optional
const SITE_NAME = 'Plant Wishlist';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Plant Wishlist')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Auto‑create the sheet if missing, otherwise return it */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('PlantWishlist');
  if (!sheet) {
    sheet = ss.insertSheet('PlantWishlist');
    const headers = [
      'Sr. No.', 'ID', 'Image', 'Plant Common Name', 'Scientific Name',
      'Variety', 'Best Vendor', 'Type of Plant (Biology)',
      'Type of Plant (Design)', 'Form Description', 'Flowering',
      'Benefits/Uses', 'Vaastu Compliance', 'Vaastu Description',
      'Care Intensity(e/m/h or rating)', 'Flowering Cycle',
      'Care Intensity(In Days)', 'Humidity Required', 'Mist Frequency',
      'Water Amount', 'Water Frequency', 'SunLight Needed'
    ];
    sheet.appendRow(headers);
  }
  return sheet;
}

function getNextIdentifiers() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  const srNo = lastRow;  // next Sr. No.
  const id = 'PLANT-' + String(srNo).padStart(5, '0');
  return { srNo: srNo, id: id };
}

function getPlantDetails(commonName) {
  const prompt = `You are a knowledgeable botanist. For the plant common name "${commonName}", return ONLY a valid JSON object (no markdown, no extra text) with exactly these keys. Provide realistic, accurate values:

{
  "Image": "a real unsplash image URL for this plant",
  "Scientific Name": "Genus species",
  "Variety": "specific variety/cultivar (or N/A)",
  "Best Vendor": "a well-known nursery or online store",
  "Type of Plant (Biology)": "Angiosperm, Gymnosperm, Fern, Moss, or Algae",
  "Type of Plant (Design)": "Tree, Shrub, Climber/Vine, Herbaceous perennial, Annual, Succulent/Cactus, or Grass",
  "Form Description": "1-2 sentence vivid description of the plant's shape and appearance",
  "Flowering": "Flowering or Non-flowering",
  "Benefits/Uses": "list of top 2-3 benefits, e.g. air purifying, medicinal, ornamental",
  "Vaastu Compliance": "Yes or No (or direction recommendation)",
  "Vaastu Description": "brief vaastu tip, e.g. 'Place in North-East for prosperity'",
  "Care Intensity(e/m/h or rating)": "Easy / Medium / Hard or rate 1-5",
  "Flowering Cycle": "e.g., Spring, Summer, Year-round, Monsoon",
  "Care Intensity(In Days)": "number of days between main care tasks",
  "Humidity Required": "Low / Medium / High",
  "Mist Frequency": "e.g., Daily, Weekly, None",
  "Water Amount": "e.g., Moderate, 1 cup, Keep soil moist",
  "Water Frequency": "e.g., Every 2 days, Weekly",
  "SunLight Needed": "e.g., Full sun, Partial shade, Indirect bright light"
}`;

  const payload = {
    model: "google/gemini-2.0-flash-001",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': SITE_URL,
      'X-Title': SITE_NAME
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(OPENROUTER_URL, options);
  const json = JSON.parse(response.getContentText());

  if (json.choices && json.choices[0]?.message?.content) {
    const data = JSON.parse(json.choices[0].message.content);
    // Return ALL fields – empty string if AI missed any
    return {
      image: data.Image || '',
      scientificName: data['Scientific Name'] || '',
      variety: data.Variety || '',
      vendor: data['Best Vendor'] || '',
      biologyType: data['Type of Plant (Biology)'] || '',
      designType: data['Type of Plant (Design)'] || '',
      formDesc: data['Form Description'] || '',
      flowering: data['Flowering'] || '',
      benefitsUses: data['Benefits/Uses'] || '',
      vaastuCompliance: data['Vaastu Compliance'] || '',
      vaastuDescription: data['Vaastu Description'] || '',
      careIntensity: data['Care Intensity(e/m/h or rating)'] || '',
      floweringCycle: data['Flowering Cycle'] || '',
      careIntensityDays: data['Care Intensity(In Days)'] || '',
      humidityRequired: data['Humidity Required'] || '',
      mistFrequency: data['Mist Frequency'] || '',
      waterAmount: data['Water Amount'] || '',
      waterFrequency: data['Water Frequency'] || '',
      sunlightNeeded: data['SunLight Needed'] || ''
    };
  } else {
    throw new Error('AI returned no content. Check OpenRouter credits.');
  }
}

function submitPlant(formData) {
  const sheet = getOrCreateSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => (formData[h] !== undefined ? formData[h] : ''));
  sheet.appendRow(row);
  return 'Plant saved successfully!';
}
