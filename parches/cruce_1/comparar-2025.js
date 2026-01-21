const XLSX = require('xlsx');
const fs = require('fs');

// ========================================
// DATOS DE SUPABASE - BAJAS 2025 (del query)
// ========================================
const bajas2025Supabase = [
  {numero_empleado:2517,fecha_baja:"2025-01-06",motivo:"Otra razón"},
  {numero_empleado:1855,fecha_baja:"2025-01-07",motivo:"Otra razón"},
  {numero_empleado:137,fecha_baja:"2025-01-14",motivo:"Rescisión por desempeño"},
  {numero_empleado:2310,fecha_baja:"2025-01-14",motivo:"Rescisión por desempeño"},
  {numero_empleado:2048,fecha_baja:"2025-01-15",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2204,fecha_baja:"2025-01-17",motivo:"Otra razón"},
  {numero_empleado:2535,fecha_baja:"2025-01-17",motivo:"Rescisión por disciplina"},
  {numero_empleado:2548,fecha_baja:"2025-01-19",motivo:"Abandono / No regresó"},
  {numero_empleado:1581,fecha_baja:"2025-01-24",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2401,fecha_baja:"2025-01-24",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2379,fecha_baja:"2025-01-28",motivo:"Otra razón"},
  {numero_empleado:2520,fecha_baja:"2025-01-28",motivo:"Otra razón"},
  {numero_empleado:2531,fecha_baja:"2025-01-28",motivo:"Abandono / No regresó"},
  {numero_empleado:2455,fecha_baja:"2025-01-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2545,fecha_baja:"2025-01-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2554,fecha_baja:"2025-01-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2555,fecha_baja:"2025-01-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2560,fecha_baja:"2025-02-02",motivo:"Abandono / No regresó"},
  {numero_empleado:2161,fecha_baja:"2025-02-04",motivo:"Término del contrato"},
  {numero_empleado:2339,fecha_baja:"2025-02-04",motivo:"Término del contrato"},
  {numero_empleado:1444,fecha_baja:"2025-02-06",motivo:"Rescisión por desempeño"},
  {numero_empleado:2462,fecha_baja:"2025-02-07",motivo:"Abandono / No regresó"},
  {numero_empleado:2565,fecha_baja:"2025-02-09",motivo:"Abandono / No regresó"},
  {numero_empleado:2171,fecha_baja:"2025-02-10",motivo:"Rescisión por desempeño"},
  {numero_empleado:2451,fecha_baja:"2025-02-10",motivo:"Otra razón"},
  {numero_empleado:2542,fecha_baja:"2025-02-10",motivo:"Abandono / No regresó"},
  {numero_empleado:2544,fecha_baja:"2025-02-11",motivo:"Abandono / No regresó"},
  {numero_empleado:2578,fecha_baja:"2025-02-16",motivo:"Abandono / No regresó"},
  {numero_empleado:2556,fecha_baja:"2025-02-17",motivo:"Abandono / No regresó"},
  {numero_empleado:2558,fecha_baja:"2025-02-17",motivo:"Abandono / No regresó"},
  {numero_empleado:2522,fecha_baja:"2025-02-18",motivo:"Otra razón"},
  {numero_empleado:2524,fecha_baja:"2025-02-20",motivo:"Otra razón"},
  {numero_empleado:1962,fecha_baja:"2025-02-21",motivo:"Rescisión por desempeño"},
  {numero_empleado:2584,fecha_baja:"2025-02-22",motivo:"Abandono / No regresó"},
  {numero_empleado:2587,fecha_baja:"2025-02-23",motivo:"Abandono / No regresó"},
  {numero_empleado:1969,fecha_baja:"2025-02-24",motivo:"Rescisión por desempeño"},
  {numero_empleado:2119,fecha_baja:"2025-02-24",motivo:"Rescisión por disciplina"},
  {numero_empleado:2297,fecha_baja:"2025-02-26",motivo:"Otra razón"},
  {numero_empleado:2567,fecha_baja:"2025-02-26",motivo:"Abandono / No regresó"},
  {numero_empleado:2579,fecha_baja:"2025-03-02",motivo:"Abandono / No regresó"},
  {numero_empleado:2326,fecha_baja:"2025-03-03",motivo:"Término del contrato"},
  {numero_empleado:2569,fecha_baja:"2025-03-06",motivo:"Otra razón"},
  {numero_empleado:2444,fecha_baja:"2025-03-07",motivo:"No le gustó el ambiente"},
  {numero_empleado:2573,fecha_baja:"2025-03-09",motivo:"Abandono / No regresó"},
  {numero_empleado:2485,fecha_baja:"2025-03-10",motivo:"Rescisión por desempeño"},
  {numero_empleado:2557,fecha_baja:"2025-03-11",motivo:"Abandono / No regresó"},
  {numero_empleado:2582,fecha_baja:"2025-03-12",motivo:"Rescisión por disciplina"},
  {numero_empleado:2605,fecha_baja:"2025-03-16",motivo:"Abandono / No regresó"},
  {numero_empleado:2607,fecha_baja:"2025-03-16",motivo:"Abandono / No regresó"},
  {numero_empleado:2608,fecha_baja:"2025-03-16",motivo:"Abandono / No regresó"},
  {numero_empleado:2568,fecha_baja:"2025-03-18",motivo:"Otra razón"},
  {numero_empleado:2080,fecha_baja:"2025-03-20",motivo:"Rescisión por desempeño"},
  {numero_empleado:2589,fecha_baja:"2025-03-22",motivo:"Abandono / No regresó"},
  {numero_empleado:2612,fecha_baja:"2025-03-30",motivo:"Otra razón"},
  {numero_empleado:2613,fecha_baja:"2025-03-30",motivo:"Otra razón"},
  {numero_empleado:2614,fecha_baja:"2025-03-30",motivo:"Otra razón"},
  {numero_empleado:2615,fecha_baja:"2025-03-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2617,fecha_baja:"2025-03-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2486,fecha_baja:"2025-03-31",motivo:"Término del contrato"},
  {numero_empleado:2488,fecha_baja:"2025-03-31",motivo:"Término del contrato"},
  {numero_empleado:2489,fecha_baja:"2025-03-31",motivo:"Término del contrato"},
  {numero_empleado:2559,fecha_baja:"2025-03-31",motivo:"Abandono / No regresó"},
  {numero_empleado:2562,fecha_baja:"2025-03-31",motivo:"Otra razón"},
  {numero_empleado:2078,fecha_baja:"2025-04-01",motivo:"Otra razón"},
  {numero_empleado:2369,fecha_baja:"2025-04-02",motivo:"Término del contrato"},
  {numero_empleado:2495,fecha_baja:"2025-04-07",motivo:"Otra razón"},
  {numero_empleado:2621,fecha_baja:"2025-04-10",motivo:"Otra razón"},
  {numero_empleado:2627,fecha_baja:"2025-04-10",motivo:"Otra razón"},
  {numero_empleado:2354,fecha_baja:"2025-04-11",motivo:"No le gustaron las instalaciones"},
  {numero_empleado:2631,fecha_baja:"2025-04-13",motivo:"Motivos de salud"},
  {numero_empleado:2632,fecha_baja:"2025-04-13",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:18,fecha_baja:"2025-04-15",motivo:"Otra razón"},
  {numero_empleado:2088,fecha_baja:"2025-04-22",motivo:"Otra razón"},
  {numero_empleado:2292,fecha_baja:"2025-04-25",motivo:"Término del contrato"},
  {numero_empleado:2511,fecha_baja:"2025-04-25",motivo:"Término del contrato"},
  {numero_empleado:2633,fecha_baja:"2025-04-26",motivo:"Otra razón"},
  {numero_empleado:2629,fecha_baja:"2025-04-28",motivo:"Otra razón"},
  {numero_empleado:2139,fecha_baja:"2025-05-02",motivo:"Término del contrato"},
  {numero_empleado:2525,fecha_baja:"2025-05-02",motivo:"Otra razón"},
  {numero_empleado:2592,fecha_baja:"2025-05-06",motivo:"Otra razón"},
  {numero_empleado:2583,fecha_baja:"2025-05-07",motivo:"Término del contrato"},
  {numero_empleado:2566,fecha_baja:"2025-05-09",motivo:"Otra razón"},
  {numero_empleado:2598,fecha_baja:"2025-05-10",motivo:"Abandono / No regresó"},
  {numero_empleado:2577,fecha_baja:"2025-05-12",motivo:"Término del contrato"},
  {numero_empleado:2642,fecha_baja:"2025-05-12",motivo:"Rescisión por disciplina"},
  {numero_empleado:1947,fecha_baja:"2025-05-13",motivo:"Rescisión por desempeño"},
  {numero_empleado:2477,fecha_baja:"2025-05-13",motivo:"Otra razón"},
  {numero_empleado:2630,fecha_baja:"2025-05-15",motivo:"Otra razón"},
  {numero_empleado:2283,fecha_baja:"2025-05-16",motivo:"Otra razón"},
  {numero_empleado:2638,fecha_baja:"2025-05-16",motivo:"Abandono / No regresó"},
  {numero_empleado:1407,fecha_baja:"2025-05-19",motivo:"Término del contrato"},
  {numero_empleado:2400,fecha_baja:"2025-05-22",motivo:"Otra razón"},
  {numero_empleado:1568,fecha_baja:"2025-05-23",motivo:"Otra razón"},
  {numero_empleado:2534,fecha_baja:"2025-05-23",motivo:"Término del contrato"},
  {numero_empleado:2646,fecha_baja:"2025-05-23",motivo:"Abandono / No regresó"},
  {numero_empleado:2595,fecha_baja:"2025-05-24",motivo:"Término del contrato"},
  {numero_empleado:2596,fecha_baja:"2025-05-24",motivo:"Término del contrato"},
  {numero_empleado:2591,fecha_baja:"2025-05-25",motivo:"Término del contrato"},
  {numero_empleado:2178,fecha_baja:"2025-05-27",motivo:"Otra razón"},
  {numero_empleado:2446,fecha_baja:"2025-05-27",motivo:"Otra razón"},
  {numero_empleado:2338,fecha_baja:"2025-05-29",motivo:"Otra razón"},
  {numero_empleado:2619,fecha_baja:"2025-05-30",motivo:"Otra razón"},
  {numero_empleado:2504,fecha_baja:"2025-05-31",motivo:"Otra razón"},
  {numero_empleado:2505,fecha_baja:"2025-05-31",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2533,fecha_baja:"2025-05-31",motivo:"Otra razón"},
  {numero_empleado:2656,fecha_baja:"2025-05-31",motivo:"Abandono / No regresó"},
  {numero_empleado:2576,fecha_baja:"2025-06-03",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2526,fecha_baja:"2025-06-05",motivo:"Otra razón"},
  {numero_empleado:2543,fecha_baja:"2025-06-09",motivo:"Otra razón"},
  {numero_empleado:2091,fecha_baja:"2025-06-10",motivo:"Otra razón"},
  {numero_empleado:2201,fecha_baja:"2025-06-10",motivo:"Otra razón"},
  {numero_empleado:1124,fecha_baja:"2025-06-12",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2564,fecha_baja:"2025-06-13",motivo:"Término del contrato"},
  {numero_empleado:2574,fecha_baja:"2025-06-13",motivo:"Rescisión por disciplina"},
  {numero_empleado:2655,fecha_baja:"2025-06-14",motivo:"Abandono / No regresó"},
  {numero_empleado:2652,fecha_baja:"2025-06-16",motivo:"Abandono / No regresó"},
  {numero_empleado:2586,fecha_baja:"2025-06-17",motivo:"Término del contrato"},
  {numero_empleado:2635,fecha_baja:"2025-06-17",motivo:"Abandono / No regresó"},
  {numero_empleado:2616,fecha_baja:"2025-06-18",motivo:"Abandono / No regresó"},
  {numero_empleado:2666,fecha_baja:"2025-06-18",motivo:"Abandono / No regresó"},
  {numero_empleado:2471,fecha_baja:"2025-06-23",motivo:"Otra razón"},
  {numero_empleado:2599,fecha_baja:"2025-06-23",motivo:"Otra razón"},
  {numero_empleado:2689,fecha_baja:"2025-06-29",motivo:"Abandono / No regresó"},
  {numero_empleado:1882,fecha_baja:"2025-06-30",motivo:"Otra razón"},
  {numero_empleado:2208,fecha_baja:"2025-06-30",motivo:"Rescisión por desempeño"},
  {numero_empleado:2623,fecha_baja:"2025-06-30",motivo:"Término del contrato"},
  {numero_empleado:2677,fecha_baja:"2025-06-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2622,fecha_baja:"2025-07-01",motivo:"Término del contrato"},
  {numero_empleado:2685,fecha_baja:"2025-07-01",motivo:"Otra razón"},
  {numero_empleado:2541,fecha_baja:"2025-07-02",motivo:"Rescisión por disciplina"},
  {numero_empleado:2602,fecha_baja:"2025-07-03",motivo:"Otra razón"},
  {numero_empleado:2625,fecha_baja:"2025-07-03",motivo:"Término del contrato"},
  {numero_empleado:2634,fecha_baja:"2025-07-04",motivo:"Término del contrato"},
  {numero_empleado:2674,fecha_baja:"2025-07-04",motivo:"Término del contrato"},
  {numero_empleado:2017,fecha_baja:"2025-07-06",motivo:"Otra razón"},
  {numero_empleado:2018,fecha_baja:"2025-07-08",motivo:"Rescisión por desempeño"},
  {numero_empleado:2175,fecha_baja:"2025-07-11",motivo:"Otra razón"},
  {numero_empleado:2695,fecha_baja:"2025-07-13",motivo:"Abandono / No regresó"},
  {numero_empleado:1864,fecha_baja:"2025-07-16",motivo:"Otra razón"},
  {numero_empleado:2690,fecha_baja:"2025-07-16",motivo:"Rescisión por disciplina"},
  {numero_empleado:2698,fecha_baja:"2025-07-18",motivo:"Abandono / No regresó"},
  {numero_empleado:2628,fecha_baja:"2025-07-21",motivo:"Otra razón"},
  {numero_empleado:2597,fecha_baja:"2025-07-22",motivo:"Término del contrato"},
  {numero_empleado:2618,fecha_baja:"2025-07-22",motivo:"Otra razón"},
  {numero_empleado:2684,fecha_baja:"2025-07-22",motivo:"Término del contrato"},
  {numero_empleado:2473,fecha_baja:"2025-07-24",motivo:"Rescisión por desempeño"},
  {numero_empleado:2527,fecha_baja:"2025-07-24",motivo:"Otra razón"},
  {numero_empleado:2609,fecha_baja:"2025-07-24",motivo:"Otra razón"},
  {numero_empleado:2679,fecha_baja:"2025-07-24",motivo:"Rescisión por disciplina"},
  {numero_empleado:2669,fecha_baja:"2025-07-25",motivo:"Término del contrato"},
  {numero_empleado:2370,fecha_baja:"2025-07-29",motivo:"Otra razón"},
  {numero_empleado:2675,fecha_baja:"2025-07-30",motivo:"Cambio de ciudad"},
  {numero_empleado:2683,fecha_baja:"2025-07-30",motivo:"Otra razón"},
  {numero_empleado:2701,fecha_baja:"2025-07-31",motivo:"Abandono / No regresó"},
  {numero_empleado:2700,fecha_baja:"2025-08-02",motivo:"Abandono / No regresó"},
  {numero_empleado:2707,fecha_baja:"2025-08-02",motivo:"Abandono / No regresó"},
  {numero_empleado:2668,fecha_baja:"2025-08-05",motivo:"Término del contrato"},
  {numero_empleado:2198,fecha_baja:"2025-08-06",motivo:"Otra razón"},
  {numero_empleado:2711,fecha_baja:"2025-08-07",motivo:"Otra razón"},
  {numero_empleado:2648,fecha_baja:"2025-08-08",motivo:"Término del contrato"},
  {numero_empleado:2713,fecha_baja:"2025-08-08",motivo:"Abandono / No regresó"},
  {numero_empleado:2287,fecha_baja:"2025-08-12",motivo:"Otra razón"},
  {numero_empleado:2697,fecha_baja:"2025-08-14",motivo:"Término del contrato"},
  {numero_empleado:2727,fecha_baja:"2025-08-17",motivo:"Abandono / No regresó"},
  {numero_empleado:2732,fecha_baja:"2025-08-17",motivo:"Abandono / No regresó"},
  {numero_empleado:2478,fecha_baja:"2025-08-18",motivo:"Otra razón"},
  {numero_empleado:1850,fecha_baja:"2025-08-23",motivo:"Término del contrato"},
  {numero_empleado:2011,fecha_baja:"2025-08-27",motivo:"Otra razón"},
  {numero_empleado:2662,fecha_baja:"2025-08-27",motivo:"Otra razón"},
  {numero_empleado:2340,fecha_baja:"2025-08-28",motivo:"Otra razón"},
  {numero_empleado:2673,fecha_baja:"2025-08-28",motivo:"Otra razón"},
  {numero_empleado:2641,fecha_baja:"2025-08-29",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2712,fecha_baja:"2025-08-29",motivo:"Otra razón"},
  {numero_empleado:2439,fecha_baja:"2025-09-02",motivo:"Otra razón"},
  {numero_empleado:2708,fecha_baja:"2025-09-02",motivo:"Otra razón"},
  {numero_empleado:2720,fecha_baja:"2025-09-04",motivo:"Término del contrato"},
  {numero_empleado:1171,fecha_baja:"2025-09-05",motivo:"Otra razón"},
  {numero_empleado:2606,fecha_baja:"2025-09-05",motivo:"Término del contrato"},
  {numero_empleado:2651,fecha_baja:"2025-09-12",motivo:"Término del contrato"},
  {numero_empleado:2653,fecha_baja:"2025-09-12",motivo:"Término del contrato"},
  {numero_empleado:2678,fecha_baja:"2025-09-15",motivo:"Término del contrato"},
  {numero_empleado:2664,fecha_baja:"2025-09-18",motivo:"Rescisión por desempeño"},
  {numero_empleado:1013,fecha_baja:"2025-09-19",motivo:"Otra razón"},
  {numero_empleado:2611,fecha_baja:"2025-09-20",motivo:"Término del contrato"},
  {numero_empleado:2593,fecha_baja:"2025-09-23",motivo:"Otra razón"},
  {numero_empleado:2687,fecha_baja:"2025-09-24",motivo:"Término del contrato"},
  {numero_empleado:2676,fecha_baja:"2025-09-26",motivo:"Abandono / No regresó"},
  {numero_empleado:2734,fecha_baja:"2025-09-26",motivo:"Otra razón"},
  {numero_empleado:550,fecha_baja:"2025-09-29",motivo:"Cambio de domicilio"},
  {numero_empleado:2348,fecha_baja:"2025-09-29",motivo:"Otra razón"},
  {numero_empleado:2658,fecha_baja:"2025-09-30",motivo:"Término del contrato"},
  {numero_empleado:2373,fecha_baja:"2025-10-01",motivo:"Otra razón"},
  {numero_empleado:2480,fecha_baja:"2025-10-06",motivo:"Otra razón"},
  {numero_empleado:2737,fecha_baja:"2025-10-06",motivo:"Otra razón"},
  {numero_empleado:2277,fecha_baja:"2025-10-07",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2752,fecha_baja:"2025-10-07",motivo:"Abandono / No regresó"},
  {numero_empleado:2756,fecha_baja:"2025-10-13",motivo:"Abandono / No regresó"},
  {numero_empleado:2762,fecha_baja:"2025-10-19",motivo:"Abandono / No regresó"},
  {numero_empleado:2755,fecha_baja:"2025-10-25",motivo:"Abandono / No regresó"},
  {numero_empleado:2765,fecha_baja:"2025-10-25",motivo:"Abandono / No regresó"},
  {numero_empleado:2660,fecha_baja:"2025-10-27",motivo:"Falta quien cuide hijos"},
  {numero_empleado:2706,fecha_baja:"2025-10-27",motivo:"Término del contrato"},
  {numero_empleado:2760,fecha_baja:"2025-10-28",motivo:"Abandono / No regresó"},
  {numero_empleado:2753,fecha_baja:"2025-10-30",motivo:"Término del contrato"},
  {numero_empleado:2761,fecha_baja:"2025-10-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2436,fecha_baja:"2025-10-31",motivo:"Cambio de ciudad"},
  {numero_empleado:2643,fecha_baja:"2025-10-31",motivo:"Rescisión por desempeño"},
  {numero_empleado:2766,fecha_baja:"2025-11-01",motivo:"Abandono / No regresó"},
  {numero_empleado:2518,fecha_baja:"2025-11-03",motivo:"Rescisión por desempeño"},
  {numero_empleado:2585,fecha_baja:"2025-11-04",motivo:"Rescisión por desempeño"},
  {numero_empleado:1130,fecha_baja:"2025-11-15",motivo:"Término del contrato"},
  {numero_empleado:2771,fecha_baja:"2025-11-16",motivo:"Abandono / No regresó"},
  {numero_empleado:2047,fecha_baja:"2025-11-21",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:944,fecha_baja:"2025-11-24",motivo:"Rescisión por desempeño"},
  {numero_empleado:1906,fecha_baja:"2025-11-24",motivo:"Rescisión por desempeño"},
  {numero_empleado:2343,fecha_baja:"2025-11-24",motivo:"Rescisión por desempeño"},
  {numero_empleado:1375,fecha_baja:"2025-11-27",motivo:"Rescisión por desempeño"},
  {numero_empleado:2736,fecha_baja:"2025-11-28",motivo:"Cambio de ciudad"},
  {numero_empleado:2779,fecha_baja:"2025-11-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2128,fecha_baja:"2025-12-01",motivo:"Falta quien cuide hijos"},
  {numero_empleado:2688,fecha_baja:"2025-12-01",motivo:"Otra razón"},
  {numero_empleado:2749,fecha_baja:"2025-12-02",motivo:"Cambio de domicilio"},
  {numero_empleado:2744,fecha_baja:"2025-12-03",motivo:"Término del contrato"},
  {numero_empleado:2746,fecha_baja:"2025-12-03",motivo:"Término del contrato"},
  {numero_empleado:2452,fecha_baja:"2025-12-04",motivo:"Abandono / No regresó"},
  {numero_empleado:2013,fecha_baja:"2025-12-05",motivo:"Rescisión por disciplina"},
  {numero_empleado:2250,fecha_baja:"2025-12-05",motivo:"Rescisión por disciplina"},
  {numero_empleado:2254,fecha_baja:"2025-12-05",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2645,fecha_baja:"2025-12-05",motivo:"Rescisión por desempeño"},
  {numero_empleado:2649,fecha_baja:"2025-12-08",motivo:"Motivos de salud"},
  {numero_empleado:2758,fecha_baja:"2025-12-09",motivo:"Motivos de salud"},
  {numero_empleado:2024,fecha_baja:"2025-12-11",motivo:"Rescisión por desempeño"},
  {numero_empleado:2724,fecha_baja:"2025-12-11",motivo:"Término del contrato"},
  {numero_empleado:2702,fecha_baja:"2025-12-19",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2790,fecha_baja:"2025-12-27",motivo:"Abandono / No regresó"},
  {numero_empleado:2791,fecha_baja:"2025-12-27",motivo:"Abandono / No regresó"}
];

console.log(`Supabase motivos_baja 2025: ${bajas2025Supabase.length} registros`);

// ========================================
// LEER EXCEL MOTIVOS BAJAS
// ========================================
console.log('\n=== LEYENDO EXCEL MOTIVOS BAJAS ===');
const wbBajas = XLSX.readFile('/Users/jaco/Desktop/proyectos/mrm_simple/parches/cruce_1/Motivos Bajas (8).xls');
const sheetBajas = wbBajas.Sheets[wbBajas.SheetNames[0]];
const dataBajas = XLSX.utils.sheet_to_json(sheetBajas, { header: 1 });

const bajasExcel = [];
for (let i = 6; i < dataBajas.length; i++) {
  const row = dataBajas[i];
  if (row && row[3]) {
    let fecha = row[2];
    let fechaStr = null;
    if (typeof fecha === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + fecha * 86400000);
      fechaStr = d.toISOString().split('T')[0];
    }

    // Solo filtrar por 2025
    if (fechaStr && fechaStr.startsWith('2025')) {
      bajasExcel.push({
        numero_empleado: parseInt(row[3]),
        fecha_baja: fechaStr,
        nombre: row[4],
        motivo: row[9]
      });
    }
  }
}
console.log(`Excel Motivos Bajas 2025: ${bajasExcel.length} registros`);

// ========================================
// LEER EXCEL EMPLEADOS
// ========================================
console.log('\n=== LEYENDO EXCEL EMPLEADOS ===');
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
      let fechaIngresoStr = null;
      if (typeof fechaIngreso === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + fechaIngreso * 86400000);
        fechaIngresoStr = d.toISOString().split('T')[0];
      }

      empleadosExcel.push({
        numero_empleado: numEmp,
        nombre: `${row[2] || ''} ${row[3] || ''}, ${row[4] || ''}`.trim(),
        fecha_ingreso: fechaIngresoStr,
        empresa: row[13] || '',
        puesto: row[16] || ''
      });
    }
  }
}

// Filtrar empleados con ingreso en 2025
const empleadosExcel2025 = empleadosExcel.filter(e => e.fecha_ingreso && e.fecha_ingreso.startsWith('2025'));
console.log(`Excel Empleados total: ${empleadosExcel.length}`);
console.log(`Excel Empleados ingreso 2025: ${empleadosExcel2025.length}`);

// ========================================
// COMPARAR BAJAS
// ========================================
console.log('\n=== COMPARANDO BAJAS 2025 ===');

const supabaseNumsBajas = new Set(bajas2025Supabase.map(b => b.numero_empleado));
const excelNumsBajas = new Set(bajasExcel.map(b => b.numero_empleado));

const bajasSoloExcel = bajasExcel.filter(b => !supabaseNumsBajas.has(b.numero_empleado));
const bajasSoloSupabase = bajas2025Supabase.filter(b => !excelNumsBajas.has(b.numero_empleado));

// Diferencias en datos (mismo empleado pero datos diferentes)
const diferenciasEnBajas = [];
for (const excelRec of bajasExcel) {
  if (supabaseNumsBajas.has(excelRec.numero_empleado)) {
    const supRec = bajas2025Supabase.find(s => s.numero_empleado === excelRec.numero_empleado);
    const diffs = [];
    if (excelRec.fecha_baja !== supRec.fecha_baja) {
      diffs.push(`Fecha: Excel=${excelRec.fecha_baja} vs Supabase=${supRec.fecha_baja}`);
    }
    if (excelRec.motivo !== supRec.motivo) {
      diffs.push(`Motivo: Excel="${excelRec.motivo}" vs Supabase="${supRec.motivo}"`);
    }
    if (diffs.length > 0) {
      diferenciasEnBajas.push({
        numero_empleado: excelRec.numero_empleado,
        nombre: excelRec.nombre,
        diferencias: diffs
      });
    }
  }
}

console.log(`Bajas solo en Excel: ${bajasSoloExcel.length}`);
console.log(`Bajas solo en Supabase: ${bajasSoloSupabase.length}`);
console.log(`Bajas con diferencias en datos: ${diferenciasEnBajas.length}`);

// ========================================
// GENERAR REPORTE
// ========================================
console.log('\n=== GENERANDO REPORTE ===');

const reporte = `# REPORTE DE CRUCE DE DATOS - AÑO 2025
## Fecha del análisis: ${new Date().toISOString().split('T')[0]}

---

## 1. MOTIVOS DE BAJA - AÑO 2025

### 1.1 Resumen

| Fuente | Total Registros 2025 |
|--------|---------------------|
| Excel (Motivos Bajas (8).xls) | ${bajasExcel.length} |
| Supabase (motivos_baja) | ${bajas2025Supabase.length} |
| **Solo en Excel** | **${bajasSoloExcel.length}** |
| **Solo en Supabase** | **${bajasSoloSupabase.length}** |
| **Con diferencias en datos** | **${diferenciasEnBajas.length}** |

### 1.2 Bajas SOLO en Excel (${bajasSoloExcel.length})
${bajasSoloExcel.length > 0 ? `
Estos registros están en el Excel pero NO en Supabase:

| # Empleado | Nombre | Fecha Baja | Motivo |
|------------|--------|------------|--------|
${bajasSoloExcel.map(b => `| ${b.numero_empleado} | ${b.nombre} | ${b.fecha_baja} | ${b.motivo} |`).join('\n')}
` : '**Ninguno** - Todos los registros del Excel están en Supabase ✅'}

### 1.3 Bajas SOLO en Supabase (${bajasSoloSupabase.length})
${bajasSoloSupabase.length > 0 ? `
Estos registros están en Supabase pero NO en el Excel:

| # Empleado | Fecha Baja | Motivo |
|------------|------------|--------|
${bajasSoloSupabase.map(b => `| ${b.numero_empleado} | ${b.fecha_baja} | ${b.motivo} |`).join('\n')}
` : '**Ninguno** - Todos los registros de Supabase están en el Excel ✅'}

### 1.4 Diferencias en Datos (mismo empleado, datos diferentes) (${diferenciasEnBajas.length})
${diferenciasEnBajas.length > 0 ? `
| # Empleado | Nombre | Diferencias |
|------------|--------|-------------|
${diferenciasEnBajas.map(d => `| ${d.numero_empleado} | ${d.nombre} | ${d.diferencias.join('; ')} |`).join('\n')}
` : '**Ninguna** - Los datos coinciden perfectamente ✅'}

---

## 2. EMPLEADOS (Ingresos 2025)

### 2.1 Resumen

| Fuente | Total Empleados | Ingresos 2025 |
|--------|-----------------|---------------|
| Excel (Validacion Alta empleados.xlsb) | ${empleadosExcel.length} | ${empleadosExcel2025.length} |
| Supabase (empleados_sftp) | 1051 | 272 |

**Nota:** La comparación detallada de empleados requiere consulta adicional a Supabase para obtener los números de empleado con ingreso en 2025.

---

## 3. CONCLUSIONES

### Para Motivos de Baja 2025:
${bajasSoloExcel.length === 0 && bajasSoloSupabase.length === 0 ?
  '- ✅ **SINCRONIZADO**: Todos los registros de bajas 2025 coinciden entre Excel y Supabase.' :
  bajasSoloExcel.length > 0 ?
    `- ⚠️ **ACCIÓN REQUERIDA**: Hay ${bajasSoloExcel.length} registros en Excel que NO están en Supabase.` :
    `- ℹ️ **INFO**: Hay ${bajasSoloSupabase.length} registros en Supabase que no están en el Excel.`
}
${diferenciasEnBajas.length > 0 ? `- ⚠️ **REVISAR**: Hay ${diferenciasEnBajas.length} registros con diferencias en fechas o motivos.` : '- ✅ Los datos coincidentes son idénticos.'}

### Números de empleado para referencia:
${bajasSoloExcel.length > 0 ? `**Solo en Excel:** ${bajasSoloExcel.map(b => b.numero_empleado).join(', ')}` : ''}
${bajasSoloSupabase.length > 0 ? `**Solo en Supabase:** ${bajasSoloSupabase.map(b => b.numero_empleado).join(', ')}` : ''}

---
*Reporte generado automáticamente el ${new Date().toISOString()}*
`;

fs.writeFileSync('/Users/jaco/Desktop/proyectos/mrm_simple/REPORTE_CRUCE_DATOS.md', reporte);
console.log('Reporte actualizado en: REPORTE_CRUCE_DATOS.md');

// JSON detallado
const datosDetallados = {
  fechaReporte: new Date().toISOString(),
  periodo: '2025',
  bajas: {
    totalExcel: bajasExcel.length,
    totalSupabase: bajas2025Supabase.length,
    soloEnExcel: bajasSoloExcel,
    soloEnSupabase: bajasSoloSupabase,
    diferencias: diferenciasEnBajas
  },
  empleados: {
    totalExcel: empleadosExcel.length,
    ingresos2025Excel: empleadosExcel2025.length
  }
};

fs.writeFileSync('/Users/jaco/Desktop/proyectos/mrm_simple/REPORTE_CRUCE_DATOS.json', JSON.stringify(datosDetallados, null, 2));
console.log('Datos detallados en: REPORTE_CRUCE_DATOS.json');
