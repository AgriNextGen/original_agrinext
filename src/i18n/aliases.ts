export type I18nAliasMap = Record<string, string>;

type PrefixAlias = {
  from: string;
  to: string;
};

// Explicit legacy -> canonical/compatible translations.
const directAliases: I18nAliasMap = {
  'auth.sign_out': 'auth.signOut',
  'settings.profile_settings': 'settings.profileSettings',
  'common.saveChanges': 'common.save_changes',
  'common.unit': 'crops.unit',
  'common.clearSearch': 'common.clearFilters',
  'enum.units.kg': 'common.kg',
  'enum.units.quintals': 'common.quintals',
  'enum.units.tonnes': 'common.tonnes',

  // Farmer module leaf-name drift (role-scoped callers -> flat dictionaries)
  'farmer.crops.myCrops': 'crops.title',
  'farmer.crops.diary': 'crops.viewDiary',
  'farmer.crops.noFarmlands': 'crops.noFarmlandsYet',
  'farmer.crops.adjustSearch': 'crops.tryAdjustingFilters',
  'farmer.crops.startAddingCrops': 'crops.startByAdding',
  'farmer.farmlands.villagePlaceholder': 'farmlands.yourVillage',
  'farmer.farmlands.districtPlaceholder': 'farmlands.yourDistrict',
  'farmer.transport.pickupPlaceholder': 'transport.enterLocation',
  'farmer.transport.notesPlaceholder': 'transport.addNotes',
  'farmer.transport.pending': 'common.pending',
  'farmer.listings.addNewListing': 'listings.createListing',
  'farmer.listings.editListing': 'listings.updateListing',
  'farmer.listings.createSuccess': 'listings.listingCreated',
  'farmer.listings.updateSuccess': 'listings.listingUpdated',
  'farmer.listings.deleteSuccess': 'listings.listingDeleted',
  'farmer.listings.quantity': 'common.quantity',
  'farmer.listings.available': 'listings.available',
};

// Temporary namespace bridge while role-scoped farmer dictionaries are completed.
const prefixAliases: PrefixAlias[] = [
  { from: 'farmer.crops.', to: 'crops.' },
  { from: 'farmer.farmlands.', to: 'farmlands.' },
  { from: 'farmer.transport.', to: 'transport.' },
  { from: 'farmer.listings.', to: 'listings.' },
];

function applyPrefixAlias(key: string): string | undefined {
  for (const rule of prefixAliases) {
    if (key.startsWith(rule.from)) {
      return `${rule.to}${key.slice(rule.from.length)}`;
    }
  }
  return undefined;
}

export function resolveTranslationAlias(key: string): string | undefined {
  return directAliases[key] ?? applyPrefixAlias(key);
}
