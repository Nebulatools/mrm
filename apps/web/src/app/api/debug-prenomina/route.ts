import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Descargando Prenomina Horizontal.csv para debug...');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/sftp?action=download&filename=Prenomina%20Horizontal.csv`);
    const data = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', data);
    
    // También verificar si el archivo está disponible
    const listResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/sftp?action=list`);
    const listData = await listResponse.json();
    console.log('📋 Archivos disponibles:', listData);
    
    if (data.data && data.data.length > 0) {
      const firstRecord = data.data[0];
      const columns = Object.keys(firstRecord);
      
      console.log('📋 Columnas encontradas:', columns);
      console.log('📋 Primer registro:', firstRecord);
      
      return NextResponse.json({
        success: true,
        totalRecords: data.data.length,
        columns: columns,
        firstRecord: firstRecord,
        allRecords: data.data.slice(0, 3) // Primeros 3 para debug
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron datos en el archivo',
        rawResponse: data,
        availableFiles: listData
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error en debug prenomina:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}