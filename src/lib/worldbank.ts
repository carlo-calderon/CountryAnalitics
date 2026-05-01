export interface CountryYearlyData {
  gini: number | null;
  gdpPpp: number | null;
}

export interface CountryHistory {
  id: string;
  name: string;
  region: string;
  history: Record<number, CountryYearlyData>;
}

export async function fetchWorldBankHistory(): Promise<CountryHistory[]> {
  const GINI_INDICATOR = 'SI.POV.GINI';
  const GDP_PPP_INDICATOR = 'NY.GDP.PCAP.PP.CD';
  const START_YEAR = 1960;
  const END_YEAR = 2024;
  
  try {
    const [giniRes, gdpRes, countriesRes] = await Promise.all([
      fetch(`https://api.worldbank.org/v2/country/all/indicator/${GINI_INDICATOR}?format=json&per_page=20000&date=${START_YEAR}:${END_YEAR}`),
      fetch(`https://api.worldbank.org/v2/country/all/indicator/${GDP_PPP_INDICATOR}?format=json&per_page=20000&date=${START_YEAR}:${END_YEAR}`),
      fetch(`https://api.worldbank.org/v2/country?format=json&per_page=1000`)
    ]);

    const giniData = await giniRes.json();
    const gdpData = await gdpRes.json();
    const countriesData = await countriesRes.json();

    if (!giniData[1] || !gdpData[1] || !countriesData[1]) return [];

    const countriesMap: Record<string, CountryHistory> = {};
    
    countriesData[1].forEach((c: any) => {
      if (c.region && c.region.id !== 'NA') {
        countriesMap[c.id] = {
          id: c.id,
          name: c.name,
          region: c.region.value.trim(),
          history: {}
        };
      }
    });

    // Process Gini
    giniData[1].forEach((item: any) => {
      const code = item.countryiso3code || item.country.id;
      if (countriesMap[code] && item.value !== null) {
        const year = parseInt(item.date);
        if (!countriesMap[code].history[year]) countriesMap[code].history[year] = { gini: null, gdpPpp: null };
        countriesMap[code].history[year].gini = item.value;
      }
    });

    // Process GDP PPP
    gdpData[1].forEach((item: any) => {
      const code = item.countryiso3code || item.country.id;
      if (countriesMap[code] && item.value !== null && item.value < 300000) {
        const year = parseInt(item.date);
        if (!countriesMap[code].history[year]) countriesMap[code].history[year] = { gini: null, gdpPpp: null };
        countriesMap[code].history[year].gdpPpp = item.value;
      }
    });

    // Fill gaps: Carry forward logic
    Object.values(countriesMap).forEach(country => {
      let lastGini: number | null = null;
      let lastGdp: number | null = null;

      for (let y = START_YEAR; y <= END_YEAR; y++) {
        const yearData = country.history[y] || { gini: null, gdpPpp: null };
        
        if (yearData.gini !== null) lastGini = yearData.gini;
        else yearData.gini = lastGini;

        if (yearData.gdpPpp !== null) lastGdp = yearData.gdpPpp;
        else yearData.gdpPpp = lastGdp;

        country.history[y] = yearData;
      }
    });

    return Object.values(countriesMap).filter(c => {
      // Keep countries that have at least one data point for both metrics eventually
      const years = Object.keys(c.history);
      return years.some(y => c.history[parseInt(y)].gini !== null) && 
             years.some(y => c.history[parseInt(y)].gdpPpp !== null);
    });

  } catch (error) {
    console.error('Error fetching World Bank history:', error);
    return [];
  }
}
