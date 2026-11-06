/**
 * Widget modules: each brand's embeddable widgets (src/widgets/types.ts). Brands not listed have none.
 * To add a widget to a brand: create brands/<slug>/widgets.ts exporting widgets(), then register it here.
 */
import type { WidgetDef } from '../src/widgets/types';
import { widgets as trailers } from './trailers/widgets';

export const widgetSets: Record<string, () => WidgetDef[]> = {
  trailers,
};
