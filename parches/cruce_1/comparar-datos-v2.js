const XLSX = require('xlsx');
const fs = require('fs');

// ========================================
// DATOS DE SUPABASE (copiados directamente)
// ========================================
const motivosBajaDB = [10,18,101,137,352,413,435,470,494,550,619,685,909,931,944,945,1013,1025,1049,1086,1110,1124,1130,1158,1171,1237,1249,1296,1298,1321,1375,1407,1417,1444,1452,1507,1528,1534,1545,1568,1570,1572,1581,1622,1628,1642,1657,1672,1715,1765,1769,1803,1811,1816,1819,1822,1838,1842,1850,1855,1856,1864,1874,1878,1882,1890,1906,1908,1913,1917,1918,1925,1926,1928,1931,1932,1933,1934,1937,1938,1939,1944,1947,1950,1951,1952,1953,1962,1963,1964,1969,1970,1971,1972,1973,1976,1978,1979,1981,1984,1987,1988,1990,2004,2005,2007,2009,2011,2013,2014,2016,2017,2018,2022,2023,2024,2032,2034,2035,2036,2037,2038,2040,2044,2046,2047,2048,2050,2051,2053,2055,2056,2058,2059,2061,2062,2063,2064,2065,2066,2067,2069,2070,2072,2074,2075,2078,2080,2081,2082,2083,2086,2088,2091,2094,2095,2096,2097,2098,2099,2100,2101,2102,2103,2104,2105,2106,2107,2108,2109,2111,2112,2113,2114,2115,2118,2119,2121,2122,2123,2124,2126,2127,2128,2129,2133,2134,2135,2136,2137,2138,2139,2140,2141,2142,2143,2146,2147,2148,2149,2151,2153,2154,2156,2158,2159,2160,2161,2163,2164,2165,2166,2168,2169,2170,2171,2172,2173,2174,2175,2176,2177,2178,2181,2182,2183,2186,2188,2189,2190,2191,2192,2193,2194,2195,2196,2197,2198,2199,2201,2202,2203,2204,2205,2206,2207,2208,2209,2210,2211,2214,2215,2216,2217,2218,2220,2221,2222,2224,2225,2227,2228,2229,2230,2231,2232,2233,2234,2235,2236,2238,2240,2241,2242,2243,2245,2246,2249,2250,2251,2252,2253,2254,2255,2256,2257,2258,2259,2260,2261,2262,2263,2265,2266,2267,2268,2269,2270,2271,2272,2273,2274,2275,2276,2277,2280,2281,2282,2283,2284,2285,2286,2287,2288,2289,2292,2293,2294,2295,2296,2297,2299,2300,2301,2302,2303,2304,2305,2306,2307,2308,2309,2310,2311,2312,2314,2315,2316,2317,2318,2319,2320,2321,2324,2325,2326,2327,2328,2329,2330,2331,2332,2333,2334,2335,2336,2338,2339,2340,2342,2343,2346,2347,2348,2349,2353,2354,2356,2357,2358,2359,2360,2361,2362,2363,2364,2365,2366,2367,2368,2369,2370,2371,2372,2373,2376,2377,2378,2379,2380,2381,2382,2383,2384,2385,2386,2387,2388,2389,2390,2394,2395,2398,2399,2400,2401,2403,2405,2406,2407,2408,2409,2410,2412,2413,2414,2415,2418,2419,2420,2421,2422,2423,2424,2425,2426,2427,2428,2429,2430,2431,2432,2434,2436,2439,2440,2441,2442,2443,2444,2446,2448,2451,2452,2454,2455,2456,2458,2459,2460,2461,2462,2463,2464,2466,2467,2468,2469,2470,2471,2472,2473,2474,2475,2477,2478,2479,2480,2482,2483,2485,2486,2488,2489,2490,2492,2493,2494,2495,2496,2499,2500,2501,2502,2504,2505,2506,2507,2508,2509,2511,2512,2515,2516,2517,2518,2519,2520,2522,2523,2524,2525,2526,2527,2528,2529,2530,2531,2532,2533,2534,2535,2537,2541,2542,2543,2544,2545,2548,2554,2555,2556,2557,2558,2559,2560,2562,2564,2565,2566,2567,2568,2569,2573,2574,2576,2577,2578,2579,2580,2582,2583,2584,2585,2586,2587,2589,2590,2591,2592,2593,2595,2596,2597,2598,2599,2602,2605,2606,2607,2608,2609,2611,2612,2613,2614,2615,2616,2617,2618,2619,2621,2622,2623,2625,2627,2628,2629,2630,2631,2632,2633,2634,2635,2638,2641,2642,2643,2645,2646,2648,2649,2651,2652,2653,2655,2656,2658,2660,2662,2664,2666,2668,2669,2673,2674,2675,2676,2677,2678,2679,2683,2684,2685,2687,2688,2689,2690,2694,2695,2697,2698,2700,2701,2702,2706,2707,2708,2711,2712,2713,2715,2720,2724,2725,2727,2732,2734,2736,2737,2742,2744,2746,2749,2752,2753,2755,2756,2758,2760,2761,2762,2765,2766,2771,2779,2790,2791,2794,2797,2798];

const empleadosDB = [3,4,10,16,17,18,21,24,25,33,60,61,65,71,76,81,83,101,106,128,137,141,147,155,174,175,187,201,235,259,279,318,322,332,352,413,429,435,470,488,494,515,518,529,531,550,590,591,619,622,630,685,689,692,693,712,719,729,766,776,778,909,921,930,931,944,945,975,1003,1012,1013,1020,1025,1032,1033,1046,1049,1061,1084,1086,1108,1110,1124,1130,1137,1138,1158,1171,1180,1205,1237,1245,1249,1262,1265,1296,1298,1321,1332,1353,1357,1367,1375,1385,1407,1412,1417,1427,1429,1431,1443,1444,1452,1453,1454,1458,1462,1480,1503,1507,1519,1528,1534,1541,1545,1553,1566,1568,1569,1570,1572,1577,1581,1586,1590,1607,1622,1627,1628,1631,1632,1642,1648,1653,1657,1671,1672,1696,1713,1715,1718,1725,1740,1743,1754,1763,1765,1766,1768,1769,1772,1773,1776,1781,1787,1789,1800,1801,1803,1808,1811,1812,1816,1818,1819,1820,1822,1824,1825,1827,1828,1829,1831,1836,1837,1838,1842,1848,1850,1855,1856,1859,1862,1864,1866,1867,1872,1874,1876,1878,1881,1882,1883,1890,1891,1892,1895,1897,1898,1899,1905,1906,1907,1908,1909,1910,1911,1913,1916,1917,1918,1920,1923,1924,1925,1926,1928,1931,1932,1933,1934,1937,1938,1939,1940,1944,1947,1948,1949,1950,1951,1952,1953,1955,1958,1961,1962,1963,1964,1965,1966,1969,1970,1971,1972,1973,1974,1975,1976,1978,1979,1981,1984,1987,1988,1989,1990,1991,1998,2000,2001,2004,2005,2006,2007,2009,2010,2011,2013,2014,2016,2017,2018,2020,2022,2023,2024,2026,2030,2032,2034,2035,2036,2037,2038,2039,2040,2043,2044,2045,2046,2047,2048,2050,2051,2053,2054,2055,2056,2057,2058,2059,2060,2061,2062,2063,2064,2065,2066,2067,2068,2069,2070,2071,2072,2073,2074,2075,2078,2079,2080,2081,2082,2083,2084,2086,2087,2088,2089,2090,2091,2092,2093,2094,2095,2096,2097,2098,2099,2100,2101,2102,2103,2104,2105,2106,2107,2108,2109,2110,2111,2112,2113,2114,2115,2116,2117,2118,2119,2120,2121,2122,2123,2124,2125,2126,2127,2128,2129,2130,2131,2132,2133,2134,2135,2136,2137,2138,2139,2140,2141,2142,2143,2144,2145,2146,2147,2148,2149,2150,2151,2152,2153,2154,2155,2156,2157,2158,2159,2160,2161,2162,2163,2164,2165,2166,2167,2168,2169,2170,2171,2172,2173,2174,2175,2176,2177,2178,2179,2180,2181,2182,2183,2184,2185,2186,2187,2188,2189,2190,2191,2192,2193,2194,2195,2196,2197,2198,2199,2200,2201,2202,2203,2204,2205,2206,2207,2208,2209,2210,2211,2212,2214,2215,2216,2217,2218,2219,2220,2221,2222,2223,2224,2225,2226,2227,2228,2229,2230,2231,2232,2233,2234,2235,2236,2237,2238,2239,2240,2241,2242,2243,2244,2245,2246,2247,2248,2249,2250,2251,2252,2253,2254,2255,2256,2257,2258,2259,2260,2261,2262,2263,2264,2265,2266,2267,2268,2269,2270,2271,2272,2273,2274,2275,2276,2277,2278,2279,2280,2281,2282,2283,2284,2285,2286,2287,2288,2289,2290,2291,2292,2293,2294,2295,2296,2297,2298,2299,2300,2301,2302,2303,2304,2305,2306,2307,2308,2309,2310,2311,2312,2313,2314,2315,2316,2317,2318,2319,2320,2321,2322,2323,2324,2325,2326,2327,2328,2329,2330,2331,2332,2333,2334,2335,2336,2337,2338,2339,2340,2341,2342,2343,2344,2345,2346,2347,2348,2349,2350,2351,2353,2354,2355,2356,2357,2358,2359,2360,2361,2362,2363,2364,2365,2366,2367,2368,2369,2370,2371,2372,2373,2374,2375,2376,2377,2378,2379,2380,2381,2382,2383,2384,2385,2386,2387,2388,2389,2390,2391,2392,2393,2394,2395,2396,2397,2398,2399,2400,2401,2402,2403,2404,2405,2406,2407,2408,2409,2410,2411,2412,2413,2414,2415,2416,2417,2418,2419,2420,2421,2422,2423,2424,2425,2426,2427,2428,2429,2430,2431,2432,2433,2434,2435,2436,2439,2440,2441,2442,2443,2444,2445,2446,2447,2448,2449,2450,2451,2452,2453,2454,2455,2456,2457,2458,2459,2460,2461,2462,2463,2464,2465,2466,2467,2468,2469,2470,2471,2472,2473,2474,2475,2476,2477,2478,2479,2480,2481,2482,2483,2484,2485,2486,2487,2488,2489,2490,2491,2492,2493,2494,2495,2496,2497,2498,2499,2500,2501,2502,2503,2504,2505,2506,2507,2508,2509,2510,2511,2512,2513,2514,2515,2516,2517,2518,2519,2520,2521,2522,2523,2524,2525,2526,2527,2528,2529,2530,2531,2532,2533,2534,2535,2536,2537,2538,2539,2540,2541,2542,2543,2544,2545,2546,2547,2548,2549,2550,2551,2552,2553,2554,2555,2556,2557,2558,2559,2560,2561,2562,2563,2564,2565,2566,2567,2568,2569,2570,2571,2572,2573,2574,2575,2576,2577,2578,2579,2580,2581,2582,2583,2584,2585,2586,2587,2588,2589,2590,2591,2592,2593,2594,2595,2596,2597,2598,2599,2600,2601,2602,2603,2604,2605,2606,2607,2608,2609,2610,2611,2612,2613,2614,2615,2616,2617,2618,2619,2620,2621,2622,2623,2624,2625,2626,2627,2628,2629,2630,2631,2632,2633,2634,2635,2636,2637,2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659,2660,2661,2662,2663,2664,2665,2666,2667,2668,2669,2670,2671,2672,2673,2674,2675,2676,2677,2678,2679,2680,2681,2682,2683,2684,2685,2686,2687,2688,2689,2690,2691,2692,2693,2694,2695,2696,2697,2698,2699,2700,2701,2702,2703,2704,2705,2706,2707,2708,2709,2710,2711,2712,2713,2714,2715,2716,2717,2718,2719,2720,2721,2722,2723,2724,2725,2726,2727,2728,2729,2730,2731,2732,2733,2734,2735,2736,2737,2738,2739,2740,2741,2742,2743,2744,2745,2746,2747,2748,2749,2750,2751,2752,2753,2754,2755,2756,2757,2758,2759,2760,2761,2762,2763,2764,2765,2766,2767,2768,2769,2770,2771,2772,2773,2774,2775,2776,2777,2778,2779,2780,2781,2782,2783,2784,2785,2786,2787,2788,2789,2790,2791,2792,2793,2794,2795,2796,2797,2798,2799,2800,2801,2802,2803,2804,2805];

const motivosBajaDBSet = new Set(motivosBajaDB);
const empleadosDBSet = new Set(empleadosDB);

console.log(`Supabase motivos_baja: ${motivosBajaDB.length} empleados únicos con baja`);
console.log(`Supabase empleados_sftp: ${empleadosDB.length} empleados`);

// ========================================
// 1. LEER MOTIVOS BAJAS EXCEL
// ========================================
console.log('\n=== LEYENDO MOTIVOS BAJAS EXCEL ===');
const wbBajas = XLSX.readFile('/Users/jaco/Desktop/proyectos/mrm_simple/parches/cruce_1/Motivos Bajas (8).xls');
const sheetBajas = wbBajas.Sheets[wbBajas.SheetNames[0]];
const dataBajas = XLSX.utils.sheet_to_json(sheetBajas, { header: 1 });

const motivosBajasExcel = [];
for (let i = 6; i < dataBajas.length; i++) {
  const row = dataBajas[i];
  if (row && row[3]) {
    let fecha = row[2];
    if (typeof fecha === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      fecha = new Date(excelEpoch.getTime() + fecha * 86400000);
      fecha = fecha.toISOString().split('T')[0];
    }

    motivosBajasExcel.push({
      numero_empleado: parseInt(row[3]),
      fecha_baja: fecha,
      nombre: row[4],
      tipo: row[8],
      motivo: row[9],
      descripcion: row[11],
      observaciones: row[12] || null
    });
  }
}
console.log(`Excel Motivos Bajas: ${motivosBajasExcel.length} registros`);

// ========================================
// 2. LEER VALIDACIÓN EMPLEADOS EXCEL
// ========================================
console.log('\n=== LEYENDO VALIDACIÓN EMPLEADOS EXCEL ===');
const wbEmpleados = XLSX.readFile('/Users/jaco/Desktop/proyectos/mrm_simple/parches/cruce_1/Validacion Alta de empleados (49).xlsb');
const sheetEmpleados = wbEmpleados.Sheets[wbEmpleados.SheetNames[0]];
const dataEmpleados = XLSX.utils.sheet_to_json(sheetEmpleados, { header: 1 });

const empleadosExcel = [];
for (let i = 1; i < dataEmpleados.length; i++) {
  const row = dataEmpleados[i];
  if (row && row[0]) {
    const numEmp = parseInt(row[0]);
    if (!isNaN(numEmp)) {
      let fechaIngreso = row[11];
      if (typeof fechaIngreso === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        fechaIngreso = new Date(excelEpoch.getTime() + fechaIngreso * 86400000);
        fechaIngreso = fechaIngreso.toISOString().split('T')[0];
      }

      empleadosExcel.push({
        numero_empleado: numEmp,
        apellido_paterno: row[2] || '',
        apellido_materno: row[3] || '',
        nombres: row[4] || '',
        empresa: row[13] || '',
        puesto: row[16] || '',
        fecha_ingreso: fechaIngreso
      });
    }
  }
}
console.log(`Excel Empleados: ${empleadosExcel.length} registros`);

// ========================================
// 3. COMPARAR MOTIVOS BAJA
// ========================================
console.log('\n=== COMPARANDO MOTIVOS BAJA ===');

const excelBajasNums = new Set(motivosBajasExcel.map(m => m.numero_empleado));

const bajassoloEnExcel = motivosBajasExcel.filter(m => !motivosBajaDBSet.has(m.numero_empleado));
const bajasSoloEnDB = motivosBajaDB.filter(n => !excelBajasNums.has(n));

console.log(`Bajas solo en Excel: ${bajassoloEnExcel.length}`);
console.log(`Bajas solo en Supabase: ${bajasSoloEnDB.length}`);

// ========================================
// 4. COMPARAR EMPLEADOS
// ========================================
console.log('\n=== COMPARANDO EMPLEADOS ===');

const excelEmpNums = new Set(empleadosExcel.map(e => e.numero_empleado));

const empSoloEnExcel = empleadosExcel.filter(e => !empleadosDBSet.has(e.numero_empleado));
const empSoloEnDB = empleadosDB.filter(n => !excelEmpNums.has(n));

console.log(`Empleados solo en Excel: ${empSoloEnExcel.length}`);
console.log(`Empleados solo en Supabase: ${empSoloEnDB.length}`);

// ========================================
// 5. GENERAR REPORTE
// ========================================
console.log('\n=== GENERANDO REPORTE ===');

const reporte = `# REPORTE DE CRUCE DE DATOS
## Fecha: ${new Date().toISOString().split('T')[0]}

---

## 1. RESUMEN MOTIVOS DE BAJA

| Fuente | Total Registros |
|--------|-----------------|
| Excel (Motivos Bajas (8).xls) | ${motivosBajasExcel.length} |
| Supabase (motivos_baja) | ${motivosBajaDB.length} empleados únicos |
| **Solo en Excel (NUEVOS)** | **${bajassoloEnExcel.length}** |
| Solo en Supabase (histórico) | ${bajasSoloEnDB.length} |

### 1.1 Registros de Baja SOLO en Excel - PARA IMPORTAR (${bajassoloEnExcel.length})
${bajassoloEnExcel.length > 0 ? `
| # Empleado | Nombre | Fecha Baja | Motivo |
|------------|--------|------------|--------|
${bajassoloEnExcel.map(r => `| ${r.numero_empleado} | ${r.nombre || ''} | ${r.fecha_baja} | ${r.motivo} |`).join('\n')}
` : '*Ninguno - Todos los registros del Excel ya están en Supabase*'}

### 1.2 Empleados con Baja SOLO en Supabase (${bajasSoloEnDB.length})
Estos empleados tienen baja en Supabase pero NO están en el Excel actual (pueden ser bajas históricas):

\`\`\`
${bajasSoloEnDB.slice(0, 50).join(', ')}${bajasSoloEnDB.length > 50 ? `\n... y ${bajasSoloEnDB.length - 50} más` : ''}
\`\`\`

---

## 2. RESUMEN EMPLEADOS

| Fuente | Total Registros |
|--------|-----------------|
| Excel (Validacion Alta empleados.xlsb) | ${empleadosExcel.length} |
| Supabase (empleados_sftp) | ${empleadosDB.length} |
| **Solo en Excel (NUEVOS)** | **${empSoloEnExcel.length}** |
| Solo en Supabase (histórico) | ${empSoloEnDB.length} |

### 2.1 Empleados SOLO en Excel - PARA IMPORTAR (${empSoloEnExcel.length})
${empSoloEnExcel.length > 0 ? `
| # Empleado | Nombre Completo | Empresa | Puesto |
|------------|-----------------|---------|--------|
${empSoloEnExcel.slice(0, 100).map(r => `| ${r.numero_empleado} | ${r.apellido_paterno} ${r.apellido_materno}, ${r.nombres} | ${r.empresa} | ${r.puesto} |`).join('\n')}
${empSoloEnExcel.length > 100 ? `\n... y ${empSoloEnExcel.length - 100} más` : ''}
` : '*Ninguno - Todos los empleados del Excel ya están en Supabase*'}

### 2.2 Empleados SOLO en Supabase (${empSoloEnDB.length})
\`\`\`
${empSoloEnDB.slice(0, 50).join(', ')}${empSoloEnDB.length > 50 ? `\n... y ${empSoloEnDB.length - 50} más` : ''}
\`\`\`

---

## 3. CONCLUSIONES Y ACCIONES RECOMENDADAS

### Para Motivos de Baja:
${bajassoloEnExcel.length > 0 ? `- **ACCIÓN REQUERIDA**: Hay ${bajassoloEnExcel.length} registros de baja en Excel que NO están en Supabase. Se deben importar.` : '- ✅ Todos los registros del Excel ya están en Supabase.'}
${bajasSoloEnDB.length > 0 ? `- **INFO**: Hay ${bajasSoloEnDB.length} empleados con baja en Supabase que no están en este Excel (bajas históricas anteriores).` : ''}

### Para Empleados:
${empSoloEnExcel.length > 0 ? `- **ACCIÓN REQUERIDA**: Hay ${empSoloEnExcel.length} empleados en Excel que NO están en Supabase. Se deben importar.` : '- ✅ Todos los empleados del Excel ya están en Supabase.'}
${empSoloEnDB.length > 0 ? `- **INFO**: Hay ${empSoloEnDB.length} empleados en Supabase que no están en este Excel.` : ''}

---

## 4. NÚMEROS DE EMPLEADO PARA REFERENCIA RÁPIDA

### Bajas solo en Excel (para importar):
${bajassoloEnExcel.length > 0 ? bajassoloEnExcel.map(r => r.numero_empleado).join(', ') : 'Ninguno'}

### Empleados solo en Excel (para importar):
${empSoloEnExcel.length > 0 ? empSoloEnExcel.map(r => r.numero_empleado).join(', ') : 'Ninguno'}

---
*Reporte generado automáticamente el ${new Date().toISOString()}*
`;

fs.writeFileSync('/Users/jaco/Desktop/proyectos/mrm_simple/REPORTE_CRUCE_DATOS.md', reporte);
console.log('Reporte guardado en: REPORTE_CRUCE_DATOS.md');

// JSON detallado
const datosDetallados = {
  fechaReporte: new Date().toISOString(),
  resumen: {
    motivosBaja: {
      totalExcel: motivosBajasExcel.length,
      totalDB: motivosBajaDB.length,
      soloEnExcel: bajassoloEnExcel.length,
      soloEnDB: bajasSoloEnDB.length
    },
    empleados: {
      totalExcel: empleadosExcel.length,
      totalDB: empleadosDB.length,
      soloEnExcel: empSoloEnExcel.length,
      soloEnDB: empSoloEnDB.length
    }
  },
  detalles: {
    bajasParaImportar: bajassoloEnExcel,
    bajasSoloEnDB,
    empleadosParaImportar: empSoloEnExcel,
    empleadosSoloEnDB: empSoloEnDB
  }
};

fs.writeFileSync('/Users/jaco/Desktop/proyectos/mrm_simple/REPORTE_CRUCE_DATOS.json', JSON.stringify(datosDetallados, null, 2));
console.log('Datos detallados guardados en: REPORTE_CRUCE_DATOS.json');
