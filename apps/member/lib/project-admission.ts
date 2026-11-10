// Participation choices transferred from the platform; no automatic admission is implied.
export type ProjectParticipationMode='solo'|'team'|'flexible';
export type ParticipationPreference='solo'|'team'|'flexible';
export function participationOptions(mode:ProjectParticipationMode):ParticipationPreference[]{return mode==='flexible'?['team','solo','flexible']:[mode];}
