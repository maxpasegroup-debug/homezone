// Serialized transactional fixture, NOT PostgreSQL or proof of distributed locks.
export function sharedSigninStore() {
  const fixture = { rows: new Map(), now: 0, fail: false, badClock: false, corrupt: false, transactions: 0 };
  let queue = Promise.resolve();
  function matches(row, where) {
    return Object.entries(where).every(([field, value]) => {
      if (value && typeof value === 'object') {
        if ('startsWith' in value && !row[field].startsWith(value.startsWith)) return false;
        if ('in' in value && !value.in.includes(row[field])) return false;
        if ('lte' in value && !(row[field] <= value.lte)) return false;
        if ('gt' in value && !(row[field] > value.gt)) return false;
        return true;
      }
      return row[field] === value;
    });
  }
  function change(row, data) {
    for (const [field,value] of Object.entries(data)) row[field] = value && typeof value === 'object' && 'increment' in value ? row[field] + value.increment : value;
    return structuredClone(row);
  }
  const db = {
    async $queryRaw() { return [{ now: fixture.badClock ? new Date(NaN) : new Date(fixture.now) }]; },
    registrationBudget: {
      async upsert({where,create,update}) {
        let row = fixture.rows.get(where.key);
        if (!row) { row = structuredClone(create); fixture.rows.set(where.key,row); }
        else change(row,update);
        return fixture.corrupt ? {...row,count:-1} : structuredClone(row);
      },
      async update({where,data}) { return change(fixture.rows.get(where.key),data); },
      async findUnique({where}) { return structuredClone(fixture.rows.get(where.key) ?? null); },
      async findMany({where,take}) { return structuredClone([...fixture.rows.values()].filter(row=>matches(row,where)).slice(0,take)); },
      async count({where}) { if(fixture.failCount)throw new Error('SYNTHETIC_PRIVATE_COUNT_FAILURE');return [...fixture.rows.values()].filter(row=>matches(row,where)).length; },
      async deleteMany({where}) { let count=0; for(const [key,row] of fixture.rows)if(matches(row,where)){fixture.rows.delete(key);count++;}return {count}; }
    },
    async $transaction(callback) {
      const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});await previous;
      const snapshot=structuredClone(fixture.rows);fixture.transactions++;
      try {if(fixture.fail)throw new Error('SYNTHETIC_PRIVATE_STORAGE_ERROR');return await callback(db);}
      catch(error){fixture.rows.clear();for(const [key,row] of snapshot)fixture.rows.set(key,row);throw error;}
      finally{release();}
    }
  };
  fixture.db=db;
  return fixture;
}
