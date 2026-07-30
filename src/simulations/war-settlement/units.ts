/**
 * Munitions count units for the war-settlement model.
 *
 * These are registered from the domain layer rather than added to the framework
 * so that `tsimulation` stays domain-independent. Each is its own dimension:
 * an interceptor is not interchangeable with a ballistic missile, and the unit
 * checker should say so if a ratio is ever built the wrong way round.
 *
 * Importing this module is what registers them, so every module that declares a
 * port in these units must import it.
 */

import { registerUnit } from 'tsimulation';

registerUnit({
  symbol: 'missile',
  dimension: 'custom:ballistic-missile',
  scale: 1,
  description: 'One ballistic missile',
});

registerUnit({
  symbol: 'launcher',
  dimension: 'custom:missile-launcher',
  scale: 1,
  description: 'One transporter-erector-launcher',
});

registerUnit({
  symbol: 'interceptor',
  dimension: 'custom:interceptor',
  scale: 1,
  description: 'One surface-to-air interceptor round',
});

registerUnit({
  symbol: 'drone',
  dimension: 'custom:drone',
  scale: 1,
  description: 'One one-way attack drone or cruise missile',
});

registerUnit({
  symbol: 'standoff-weapon',
  dimension: 'custom:standoff-weapon',
  scale: 1,
  description: 'One Tomahawk- or JASSM-class standoff strike weapon',
});
