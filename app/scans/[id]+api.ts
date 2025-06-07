import Database from 'better-sqlite3';
import { join } from 'path';

// Initialize SQLite database
const dbPath = join(process.cwd(), 'qr_scanner.db');
const db = new Database(dbPath);

// GET: Retrieve specific scan by ID
export async function GET(request: Request, { id }: { id: string }) {
  try {
    const scanId = parseInt(id);
    
    if (isNaN(scanId)) {
      return Response.json(
        { success: false, error: 'Invalid scan ID' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    const scan = stmt.get(scanId);

    if (!scan) {
      return Response.json(
        { success: false, error: 'Scan not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      scan
    });
  } catch (error) {
    console.error('Error fetching scan:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to fetch scan',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove specific scan by ID
export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    const scanId = parseInt(id);
    
    if (isNaN(scanId)) {
      return Response.json(
        { success: false, error: 'Invalid scan ID' },
        { status: 400 }
      );
    }

    // Check if scan exists
    const checkStmt = db.prepare('SELECT id FROM scans WHERE id = ?');
    const existingScan = checkStmt.get(scanId);

    if (!existingScan) {
      return Response.json(
        { success: false, error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Delete the scan
    const deleteStmt = db.prepare('DELETE FROM scans WHERE id = ?');
    const result = deleteStmt.run(scanId);

    return Response.json({
      success: true,
      message: 'Scan deleted successfully',
      deletedId: scanId,
      changes: result.changes
    });
  } catch (error) {
    console.error('Error deleting scan:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to delete scan',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT: Update specific scan by ID
export async function PUT(request: Request, { id }: { id: string }) {
  try {
    const scanId = parseInt(id);
    
    if (isNaN(scanId)) {
      return Response.json(
        { success: false, error: 'Invalid scan ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Check if scan exists
    const checkStmt = db.prepare('SELECT id FROM scans WHERE id = ?');
    const existingScan = checkStmt.get(scanId);

    if (!existingScan) {
      return Response.json(
        { success: false, error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Update the scan
    const updateStmt = db.prepare(`
      UPDATE scans 
      SET qr_data = COALESCE(?, qr_data),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          altitude = COALESCE(?, altitude),
          accuracy = COALESCE(?, accuracy)
      WHERE id = ?
    `);

    const result = updateStmt.run(
      body.qr_data || null,
      body.latitude || null,
      body.longitude || null,
      body.altitude || null,
      body.accuracy || null,
      scanId
    );

    // Get updated scan
    const getStmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    const updatedScan = getStmt.get(scanId);

    return Response.json({
      success: true,
      message: 'Scan updated successfully',
      scan: updatedScan,
      changes: result.changes
    });
  } catch (error) {
    console.error('Error updating scan:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to update scan',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}