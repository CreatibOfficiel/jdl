import { describe, expect, it } from 'vitest';
import { createInventory, createMockPlayer } from '../test-helpers/createMockPlayer';
import { addItem, hasItem, removeItem } from './inventoryManager';

describe('inventoryManager', () => {
  it('addItem pushes to inventory', () => {
    const player = createMockPlayer();
    addItem(player, 'prison_key');
    expect(player.inventory.includes('prison_key')).toBe(true);
    expect(player.inventory.length).toBe(1);
  });

  it('addItem appends to existing inventory', () => {
    const player = createMockPlayer({ inventory: createInventory('prison_key') });
    addItem(player, 'crowbar');
    expect(player.inventory.length).toBe(2);
    expect(player.inventory.at(0)).toBe('prison_key');
    expect(player.inventory.at(1)).toBe('crowbar');
  });

  it('hasItem returns true for existing item', () => {
    const player = createMockPlayer({ inventory: createInventory('prison_key', 'crowbar') });
    expect(hasItem(player, 'prison_key')).toBe(true);
    expect(hasItem(player, 'crowbar')).toBe(true);
  });

  it('hasItem returns false for missing item', () => {
    const player = createMockPlayer({ inventory: createInventory('prison_key') });
    expect(hasItem(player, 'loaded_die')).toBe(false);
  });

  it('hasItem returns false for empty inventory', () => {
    const player = createMockPlayer();
    expect(hasItem(player, 'prison_key')).toBe(false);
  });

  it('removeItem removes first occurrence and returns true', () => {
    const player = createMockPlayer({
      inventory: createInventory('prison_key', 'crowbar', 'prison_key'),
    });
    const result = removeItem(player, 'prison_key');
    expect(result).toBe(true);
    expect(player.inventory.length).toBe(2);
    expect(player.inventory.at(0)).toBe('crowbar');
    expect(player.inventory.at(1)).toBe('prison_key');
  });

  it('removeItem returns false for missing item', () => {
    const player = createMockPlayer({ inventory: createInventory('prison_key') });
    const result = removeItem(player, 'loaded_die');
    expect(result).toBe(false);
    expect(player.inventory.length).toBe(1);
  });

  it('removeItem on empty inventory returns false', () => {
    const player = createMockPlayer();
    expect(removeItem(player, 'prison_key')).toBe(false);
  });
});
