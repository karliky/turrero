// Creates data/turrero.db if needed and applies pending schema migrations.
import { migrate, openDb } from '../lib/db';

const db = openDb();
const applied = migrate(db);
db.close();
console.log(applied === 0 ? 'Database is up to date.' : `Applied ${applied} migration(s).`);
