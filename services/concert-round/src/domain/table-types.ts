// Table types (FR-37): the kinds of table a zone map places (a 6-person sofa, a 2-person round table), defined by the
// Manager and joined by id into every table of a map or a round.
import { DomainError } from '@seats/errors/src/index.js';
import { tableTypes } from '../repository.js';
import type { TableType } from '../model.js';

export async function defineTableType(id: string, { name, capacity, packageContent }: Partial<TableType>): Promise<TableType> {
  if (!id || !name || !Number.isInteger(capacity) || (capacity as number) < 1) throw new DomainError('invalid', 'id, name and a capacity of at least 1 are required');
  return tableTypes.save({ id, name, capacity: capacity as number, packageContent: packageContent ?? '' });
}
export const listTableTypes = (): Promise<TableType[]> => tableTypes.all();
