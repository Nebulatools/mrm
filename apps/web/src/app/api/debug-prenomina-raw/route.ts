import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Descargando Prenomina Horizontal.csv RAW...');
    
    // Hacer request directo al SFTP para obtener contenido raw
    const response = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/sftp?action=download&filename=Prenomina%20Horizontal.csv&raw=true`);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      });
    }
    
    const textContent = await response.text();
    
    console.log('📄 Contenido raw length:', textContent.length);
    console.log('📄 Primeros 500 caracteres:', textContent.substring(0, 500));
    
    // Analizar el formato
    const lines = textContent.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';
    
    // Detectar separador
    const commaCount = firstLine.split(',').length - 1;
    const semicolonCount = firstLine.split(';').length - 1;
    const tabCount = firstLine.split('\t').length - 1;
    
    const separator = semicolonCount > commaCount ? ';' : 
                     tabCount > commaCount ? '\t' : ',';
    
    console.log('📊 Separador detectado:', separator, `(comas: ${commaCount}, puntos y comas: ${semicolonCount}, tabs: ${tabCount})`);
    
    // Parsear header y primera fila
    const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, ''));
    const firstDataRow = secondLine ? secondLine.split(separator).map(h => h.trim().replace(/"/g, '')) : [];
    
    return NextResponse.json({
      success: true,
      fileSize: textContent.length,
      totalLines: lines.length,
      separator: separator,
      headers: headers,
      firstDataRow: firstDataRow,
      rawPreview: textContent.substring(0, 1000), // Primeros 1000 caracteres
      detectedFormat: {
        commaCount,
        semicolonCount, 
        tabCount,
        encoding: 'Detected automatically'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error en debug prenomina raw:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}