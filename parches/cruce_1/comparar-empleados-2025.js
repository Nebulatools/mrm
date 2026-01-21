const XLSX = require('xlsx');

// ========================================
// EMPLEADOS CON INGRESO 2025 - SUPABASE
// ========================================
const supabaseEmpleados2025 = [
  18, 413, 531, 1013, 1130, 1205, 1740, 1850, 1862, 1872, 1952, 1989, 2040, 2145, 2198,
  2471, 2539, 2540, 2541, 2542, 2543, 2544, 2545, 2546, 2547, 2548, 2549, 2550, 2551,
  2552, 2553, 2554, 2555, 2556, 2557, 2558, 2559, 2560, 2561, 2562, 2563, 2564, 2565,
  2566, 2567, 2568, 2569, 2570, 2571, 2572, 2573, 2574, 2575, 2576, 2577, 2578, 2579,
  2580, 2581, 2582, 2583, 2584, 2585, 2586, 2587, 2588, 2589, 2590, 2591, 2592, 2593,
  2594, 2595, 2596, 2597, 2598, 2599, 2600, 2601, 2602, 2603, 2604, 2605, 2606, 2607,
  2608, 2609, 2610, 2611, 2612, 2613, 2614, 2615, 2616, 2617, 2618, 2619, 2620, 2621,
  2622, 2623, 2624, 2625, 2626, 2627, 2628, 2629, 2630, 2631, 2632, 2633, 2634, 2635,
  2636, 2637, 2638, 2639, 2640, 2641, 2642, 2643, 2644, 2645, 2646, 2647, 2648, 2649,
  2650, 2651, 2652, 2653, 2654, 2655, 2656, 2657, 2658, 2659, 2660, 2661, 2662, 2663,
  2664, 2665, 2666, 2667, 2668, 2669, 2670, 2671, 2672, 2673, 2674, 2675, 2676, 2677,
  2678, 2679, 2680, 2681, 2682, 2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691,
  2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705,
  2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719,
  2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733,
  2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747,
  2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761,
  2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775,
  2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789,
  2790, 2791, 2792, 2793, 2794
];

console.log(`Total empleados Supabase con ingreso 2025: ${supabaseEmpleados2025.length}`);

// ========================================
// LEER EXCEL DE EMPLEADOS
// ========================================
console.log('\n=== LEYENDO EXCEL EMPLEADOS ===');

const wbEmpleados = XLSX.readFile('/Users/jaco/Desktop/proyectos/mrm_simple/parches/cruce_1/Validacion Alta de empleados (49).xlsb');
const sheetEmpleados = wbEmpleados.Sheets[wbEmpleados.SheetNames[0]];
const dataEmpleados = XLSX.utils.sheet_to_json(sheetEmpleados, { header: 1 });

const excelEmpleados2025 = [];

// Función para convertir fecha Excel a string ISO
function excelDateToISO(excelDate) {
  if (typeof excelDate === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + excelDate * 86400000);
    return date.toISOString().split('T')[0];
  }
  return excelDate;
}

// Columna 11 = Fecha Ingreso, Columna 0 = Número empleado
for (let i = 1; i < dataEmpleados.length; i++) {
  const row = dataEmpleados[i];
  if (row && row[0]) {
    const numEmp = parseInt(row[0]);
    if (!isNaN(numEmp)) {
      const fechaIngreso = excelDateToISO(row[11]);
      if (fechaIngreso && fechaIngreso.startsWith('2025')) {
        excelEmpleados2025.push({
          numero_empleado: numEmp,
          fecha_ingreso: fechaIngreso,
          nombre: `${row[4] || ''} ${row[2] || ''} ${row[3] || ''}`.trim()
        });
      }
    }
  }
}

console.log(`Total empleados Excel con ingreso 2025: ${excelEmpleados2025.length}`);

// ========================================
// COMPARAR
// ========================================
console.log('\n=== COMPARANDO EMPLEADOS 2025 ===');

const supabaseSet = new Set(supabaseEmpleados2025);
const excelSet = new Set(excelEmpleados2025.map(e => e.numero_empleado));

// Solo en Supabase
const soloEnSupabase = supabaseEmpleados2025.filter(num => !excelSet.has(num));
console.log(`\nSolo en Supabase (${soloEnSupabase.length}):`);
console.log(soloEnSupabase);

// Solo en Excel
const soloEnExcel = excelEmpleados2025.filter(e => !supabaseSet.has(e.numero_empleado));
console.log(`\nSolo en Excel (${soloEnExcel.length}):`);
soloEnExcel.forEach(e => console.log(`  ${e.numero_empleado}: ${e.nombre} (${e.fecha_ingreso})`));

// Resumen
console.log('\n=== RESUMEN ===');
console.log(`Supabase 2025: ${supabaseEmpleados2025.length}`);
console.log(`Excel 2025: ${excelEmpleados2025.length}`);
console.log(`Solo en Supabase: ${soloEnSupabase.length}`);
console.log(`Solo en Excel: ${soloEnExcel.length}`);
console.log(`En ambos: ${supabaseEmpleados2025.length - soloEnSupabase.length}`);
