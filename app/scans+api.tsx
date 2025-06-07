// scans+api.tsx
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Solución definitiva para el error de wa-sqlite
if (Platform.OS === 'web') {
  const originalOpenDatabase = SQLite.openDatabaseSync;
  SQLite.openDatabaseSync = function(name: string) {
    return originalOpenDatabase(name);
  };
}

// Abrir la base de datos de forma segura
let db: SQLite.SQLiteDatabase;

const getDatabase = () => {
  if (!db) {
    db = SQLite.openDatabaseSync('qr_scanner.db');
  }
  return db;
};

// Inicialización mejorada con verificación
export const initDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.transaction(
      tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qr_data TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            altitude REAL,
            accuracy REAL,
            timestamp INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`,
          [],
          () => resolve(),
          (_, error) => {
            console.error('Error creating table:', error);
            reject(error);
            return true;
          }
        );
      },
      error => {
        console.error('Transaction error:', error);
        reject(error);
      }
    );
  });
};

// Obtener scans con verificación de inicialización
export const getScans = async (): Promise<ScanRecord[]> => {
  try {
    await initDatabase(); // Asegurar que la DB esté inicializada
    const database = getDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(
        tx => {
          tx.executeSql(
            'SELECT * FROM scans ORDER BY timestamp DESC;',
            [],
            (_, result) => resolve(result.rows._array as ScanRecord[]),
            (_, error) => {
              console.error('Query error:', error);
              reject(error);
              return true;
            }
          );
        },
        error => {
          console.error('Transaction error:', error);
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error in getScans:', error);
    throw error;
  }
};

// Guardar scan con verificación mejorada
export const addScan = async (
  scanData: Omit<ScanRecord, 'id' | 'created_at'>
): Promise<number> => {
  try {
    await initDatabase(); // Asegurar que la DB esté inicializada
    const database = getDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(
        tx => {
          tx.executeSql(
            `INSERT INTO scans (qr_data, latitude, longitude, altitude, accuracy, timestamp)
             VALUES (?, ?, ?, ?, ?, ?);`,
            [
              scanData.qr_data,
              scanData.latitude ?? null,
              scanData.longitude ?? null,
              scanData.altitude ?? null,
              scanData.accuracy ?? null,
              scanData.timestamp,
            ],
            (_, result) => {
              if (result.insertId) {
                resolve(result.insertId);
              } else {
                reject(new Error('No se obtuvo ID de inserción'));
              }
            },
            (_, error) => {
              console.error('Insert error:', error);
              reject(error);
              return true;
            }
          );
        },
        error => {
          console.error('Transaction error:', error);
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error in addScan:', error);
    throw error;
  }
};

// Eliminar scan mejorado
export const deleteScan = async (id: number): Promise<boolean> => {
  try {
    await initDatabase();
    const database = getDatabase();
    
    return new Promise((resolve, reject) => {
      database.transaction(
        tx => {
          tx.executeSql(
            'DELETE FROM scans WHERE id = ?;',
            [id],
            (_, result) => resolve(result.rowsAffected > 0),
            (_, error) => {
              console.error('Delete error:', error);
              reject(error);
              return true;
            }
          );
        },
        error => {
          console.error('Transaction error:', error);
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error in deleteScan:', error);
    throw error;
  }
};

// Interface mejorada
export interface ScanRecord {
  id: number;
  qr_data: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
  created_at: string;
}