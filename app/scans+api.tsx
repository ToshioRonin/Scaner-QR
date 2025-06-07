import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('qr_scanner.db');

// Inicializar la base de datos
export const initDatabase = () => {
  db.transaction((tx: SQLite.SQLTransaction) => {
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
      );`
    );
  });
};

// Obtener todos los scans
export const getScans = (): Promise<ScanRecord[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: SQLite.SQLTransaction) => {
      tx.executeSql(
        'SELECT * FROM scans ORDER BY timestamp DESC;',
        [],
        (_: SQLite.SQLTransaction, { rows }: { rows: { _array: ScanRecord[] } }) => resolve(rows._array),
        (_: SQLite.SQLTransaction, error: SQLite.SQLError) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Agregar nuevo scan
export const addScan = (scanData: Omit<ScanRecord, 'id'|'created_at'>): Promise<ScanRecord> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: SQLite.SQLTransaction) => {
      tx.executeSql(
        `INSERT INTO scans (qr_data, latitude, longitude, altitude, accuracy, timestamp)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          scanData.qr_data,
          scanData.latitude || null,
          scanData.longitude || null,
          scanData.altitude || null,
          scanData.accuracy || null,
          scanData.timestamp
        ],
        (_: SQLite.SQLTransaction, { insertId }: { insertId: number }) => {
          tx.executeSql(
            'SELECT * FROM scans WHERE id = ?;',
            [insertId],
            (_: SQLite.SQLTransaction, { rows }: { rows: { _array: ScanRecord[] } }) => resolve(rows._array[0]),
            (_: SQLite.SQLTransaction, error: SQLite.SQLError) => {
              reject(error);
              return false;
            }
          );
        },
        (_: SQLite.SQLTransaction, error: SQLite.SQLError) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Eliminar un scan
export const deleteScan = (id: number): Promise<boolean> => {
  return new Promise((resolve) => {
    db.transaction((tx: SQLite.SQLTransaction) => {
      tx.executeSql(
        'DELETE FROM scans WHERE id = ?;',
        [id],
        () => resolve(true),
        () => resolve(false)
      );
    });
  });
};

// Tipo para TypeScript
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