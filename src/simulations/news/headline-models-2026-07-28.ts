import {
  defineModel,
  opaquePort,
  type ModelDefinition,
} from 'tsimulation';
import {
  evaluateGermanySickNotes,
  evaluateNvidiaVendorFinancing,
  evaluateSpainLabourMarket,
  type GermanySickNoteCase,
  type GermanySickNoteResult,
  type NvidiaVendorFinancingCase,
  type NvidiaVendorFinancingResult,
  type SpainLabourMarketCase,
  type SpainLabourMarketResult,
} from './headline-experiments-2026-07-28.js';

export interface HeadlineModelInput<TCase extends object> {
  case: TCase;
}

export interface HeadlineModelOutput<TResult extends object> {
  result: TResult;
}

function defineHeadlineModel<
  TCase extends object,
  TResult extends object,
>(options: {
  id: string;
  description: string;
  evaluate: (input: TCase) => TResult;
}): ModelDefinition<
  HeadlineModelInput<TCase>,
  HeadlineModelOutput<TResult>
> {
  return defineModel({
    id: options.id,
    version: '1.0.0',
    description: options.description,
    inputPorts: {
      case: opaquePort(
        'Mixed-unit, source-specific case inputs preserved verbatim.',
      ),
    } as ModelDefinition<
      HeadlineModelInput<TCase>,
      HeadlineModelOutput<TResult>
    >['inputPorts'],
    outputPorts: {
      result: opaquePort(
        'Mixed-unit accounting or sensitivity result.',
      ),
    } as ModelDefinition<
      HeadlineModelInput<TCase>,
      HeadlineModelOutput<TResult>
    >['outputPorts'],
    semanticValidation: 'if-present',
    run: ({ case: input }) => ({ result: options.evaluate(input) }),
  });
}

export const spainLabourMarketV1Model = defineHeadlineModel<
  SpainLabourMarketCase,
  SpainLabourMarketResult['initialV1']
>({
  id: 'news-spain-labour-market-v1-raw-accounting',
  description:
    'First-pass raw quarterly-stock reconciliation of Spain employment, labour force, and unemployment.',
  evaluate: (input) => evaluateSpainLabourMarket(input).initialV1,
});

export const spainLabourMarketV2Model = defineHeadlineModel<
  SpainLabourMarketCase,
  SpainLabourMarketResult['revisedV2']
>({
  id: 'news-spain-labour-market-v2-seasonal-annual-checks',
  description:
    'Revised Spain labour-market reconciliation using adjusted-growth proxies and an annual comparison.',
  evaluate: (input) => evaluateSpainLabourMarket(input).revisedV2,
});

export const nvidiaVendorFinancingV1Model = defineHeadlineModel<
  NvidiaVendorFinancingCase,
  NvidiaVendorFinancingResult['initialV1']
>({
  id: 'news-nvidia-vendor-financing-v1-face-value',
  description:
    'First-pass comparison of reported contingent guarantee face value with the observed equity-value move.',
  evaluate: (input) => evaluateNvidiaVendorFinancing(input).initialV1,
});

export const nvidiaVendorFinancingV2Model = defineHeadlineModel<
  NvidiaVendorFinancingCase,
  NvidiaVendorFinancingResult['revisedV2']
>({
  id: 'news-nvidia-vendor-financing-v2-expected-loss',
  description:
    'Revised contingent expected-loss sensitivity plus an existing AI customer capital-cycle mechanism check.',
  evaluate: (input) => evaluateNvidiaVendorFinancing(input).revisedV2,
});

export const germanySickNoteV1Model = defineHeadlineModel<
  GermanySickNoteCase,
  GermanySickNoteResult['initialV1']
>({
  id: 'news-germany-sick-note-v1-full-productivity',
  description:
    'First-pass upper-bound identity treating every suppressed recorded sick day as fully productive work.',
  evaluate: (input) => evaluateGermanySickNotes(input).initialV1,
});

export const germanySickNoteV2Model = defineHeadlineModel<
  GermanySickNoteCase,
  GermanySickNoteResult['revisedV2']
>({
  id: 'news-germany-sick-note-v2-behavioural-envelope',
  description:
    'Revised conditional envelope separating recorded absence, attendance, productivity, infection, and administration.',
  evaluate: (input) => evaluateGermanySickNotes(input).revisedV2,
});
