export interface CountryHistory {
  id: string;
  name: string;
  region: string;
  history: Record<number, Record<string, number | null>>;
}

export const INDICATORS: Record<string, string> = {
  gini: 'SI.POV.GINI',
  gdpPpp: 'NY.GDP.PCAP.PP.CD',
  gdpUsd: 'NY.GDP.PCAP.CD',
  poverty: 'SI.POV.DDAY',
  poverty10: 'SI.DST.FRST.10',
  debt: 'GC.DOD.TOTL.GD.ZS',
  taxRevenue: 'GC.TAX.TOTL.GD.ZS',
  health: 'SH.XPD.CHEX.GD.ZS',
  education: 'SE.XPD.TOTL.GD.ZS',
  lifeExpectancy: 'SP.DYN.LE00.IN',
  population: 'SP.POP.TOTL',
  corruption: 'CC.EST',
  ruleOfLaw: 'RL.EST',
  govEffectiveness: 'GE.EST',
  femaleLabor: 'SL.TLF.CACT.FE.ZS',
  unemployment: 'SL.UEM.TOTL.ZS',
  informality: 'SL.ISV.IFRM.ZS',
  laborParticipation: 'SL.TLF.CACT.ZS'
};

export const INDICATOR_NAMES: Record<string, string> = {
  gini: 'Índice de Gini',
  gdpPpp: 'PIB per cápita PPA (USD)',
  gdpUsd: 'PIB per cápita (USD Actual)',
  poverty: '% Pobreza ($2.15/día)',
  poverty10: 'Ingreso 10% más pobre (%)',
  debt: '% Deuda Central / PIB',
  taxRevenue: '% Recaudación Impuestos / PIB',
  health: '% Gasto Salud / PIB',
  education: '% Gasto Educación / PIB',
  lifeExpectancy: 'Esperanza de Vida (Años)',
  population: 'Población Total',
  corruption: 'Control de Corrupción (WGI)',
  ruleOfLaw: 'Estado de Derecho (WGI)',
  govEffectiveness: 'Efectividad Gobierno (WGI)',
  femaleLabor: '% Participación Laboral Femenina',
  unemployment: '% Desempleo Total',
  informality: '% Empleo Informal',
  laborParticipation: '% Participación Laboral Total (15+)'
};

export async function fetchWorldBankHistory(): Promise<CountryHistory[]> {
  const START_YEAR = 1960;
  const END_YEAR = 2024;
  
  try {
    // Fetch countries
    const countriesRes = await fetch(`https://api.worldbank.org/v2/country?format=json&per_page=1000`);
    const countriesData = await countriesRes.json();
    if (!countriesData[1]) return [];

    const countriesMap: Record<string, CountryHistory> = {};
    countriesData[1].forEach((c: any) => {
      if (c.region && c.region.id !== 'NA') {
        countriesMap[c.id] = { id: c.id, name: c.name, region: c.region.value.trim(), history: {} };
      }
    });

    const indicatorKeys = Object.keys(INDICATORS);
    
    // Fetch in chunks of 5 indicators to avoid timeouts or URI limits if we had many
    const results: any[] = [];
    for (let i = 0; i < indicatorKeys.length; i += 5) {
      const chunk = indicatorKeys.slice(i, i + 5);
      const promises = chunk.map(key => 
        fetch(`https://api.worldbank.org/v2/country/all/indicator/${INDICATORS[key]}?format=json&per_page=20000&date=${START_YEAR}:${END_YEAR}`)
          .then(res => res.json())
          .catch(e => { console.error(`Error fetching ${key}:`, e); return [null, null]; })
      );
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    results.forEach((data, index) => {
      const key = indicatorKeys[index];
      if (data && data[1]) {
        data[1].forEach((item: any) => {
          const code = item.countryiso3code || item.country.id;
          if (countriesMap[code]) {
            const year = parseInt(item.date);
            if (!countriesMap[code].history[year]) {
              countriesMap[code].history[year] = {};
              indicatorKeys.forEach(k => countriesMap[code].history[year][k] = null);
            }
            countriesMap[code].history[year][key] = item.value;
          }
        });
      }
    });

    // Carry forward
    Object.values(countriesMap).forEach(country => {
      const lastValues: Record<string, number | null> = {};
      indicatorKeys.forEach(k => lastValues[k] = null);
      for (let y = START_YEAR; y <= END_YEAR; y++) {
        if (!country.history[y]) {
          country.history[y] = { ...lastValues };
        } else {
          indicatorKeys.forEach(k => {
            if (country.history[y][k] !== null) lastValues[k] = country.history[y][k];
            else country.history[y][k] = lastValues[k];
          });
        }
      }
    });

    return Object.values(countriesMap).filter(c => {
      const years = Object.keys(c.history);
      return years.some(y => parseInt(y) > 2000 && (c.history[parseInt(y)].gdpPpp !== null || c.history[parseInt(y)].gdpUsd !== null));
    });

  } catch (error) {
    console.error('Error fetching World Bank history:', error);
    return [];
  }
}
