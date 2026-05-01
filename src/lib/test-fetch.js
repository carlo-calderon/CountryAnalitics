const GINI_INDICATOR = 'SI.POV.GINI';
const GDP_PPP_INDICATOR = 'NY.GDP.PCAP.PP.CD';

async function testFetch() {
  console.log('Fetching Gini...');
  const giniRes = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${GINI_INDICATOR}?format=json&per_page=20000&date=2000:2024`);
  const giniData = await giniRes.json();
  console.log('Gini entries:', giniData[1]?.length);
  console.log('First Gini item:', JSON.stringify(giniData[1]?.[0], null, 2));

  console.log('Fetching GDP...');
  const gdpRes = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${GDP_PPP_INDICATOR}?format=json&per_page=20000&date=2000:2024`);
  const gdpData = await gdpRes.json();
  console.log('GDP entries:', gdpData[1]?.length);

  console.log('Fetching Countries...');
  const countriesRes = await fetch(`https://api.worldbank.org/v2/country?format=json&per_page=1000`);
  const countriesData = await countriesRes.json();
  console.log('Countries entries:', countriesData[1]?.length);

  const countriesMap = {};
  countriesData[1].forEach((c) => {
    if (c.region.id !== 'NA') {
      countriesMap[c.id] = { name: c.name, region: c.region.value, gini: null, gdpPpp: null };
    }
  });

  giniData[1].forEach((item) => {
    const id = item.countryiso3code || item.country.id;
    if (countriesMap[id] && item.value !== null) {
      if (!countriesMap[id].gini) countriesMap[id].gini = item.value;
    }
  });

  gdpData[1].forEach((item) => {
    const id = item.countryiso3code || item.country.id;
    if (countriesMap[id] && item.value !== null) {
      if (!countriesMap[id].gdpPpp) countriesMap[id].gdpPpp = item.value;
    }
  });

  const final = Object.values(countriesMap).filter(c => c.gini && c.gdpPpp);
  console.log('Final joined countries:', final.length);
  
  const highGini = final.filter(c => c.gini > 40);
  console.log('Countries with Gini > 40:', highGini.length);
  if (highGini.length > 0) console.log('Sample high Gini:', highGini[0]);

  const crazyGdp = final.filter(c => c.gdpPpp > 200000);
  console.log('Countries with GDP > 200k:', crazyGdp.length);
  if (crazyGdp.length > 0) console.log('Sample crazy GDP:', crazyGdp[0]);
}

testFetch();
