export interface TaxonomyTopic {
  id: string;
  label: string;
  active: boolean;
}

export interface TaxonomyCategory {
  id: string;
  labelDe: string;
  labelEn?: string;
  active: boolean;
  topics: TaxonomyTopic[];
}

export interface TaxonomyDoc {
  categories: TaxonomyCategory[];
  updatedAt: number;
}

/** Client/API shape for active categories only. */
export interface TaxonomyCategoryView {
  id: string;
  labelDe: string;
  labelEn?: string;
  topics: { id: string; label: string }[];
}

export const CUSTOM_TOPIC_VALUE = "__custom__";
