import { NextResponse } from 'next/server';
import { populateDatabase } from '@/lib/supabase-admin';

export async function POST() {
  try {
    console.log('🚀 Starting database population...');
    
    const result = await populateDatabase();
    
    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: 'Insertados: 35 empleados, 15 incidencias, y registros de actividad diaria'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to populate database' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in setup-database API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    }, { status: 500 });
  }
}