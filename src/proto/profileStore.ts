import type {Profile} from './reference'
export const profileKey='mealfit:profile:v1'
export const emptyProfile=():Profile=>({nickname:'',age:null,sex:'',stage:'normal',height:null,weight:null})
export function parseProfile(raw:string|null):Profile{
 if(!raw)return emptyProfile();const p=JSON.parse(raw);const optional=(n:unknown)=>n===null||(typeof n==='number'&&Number.isFinite(n)&&n>=0);
 if(!p||typeof p.nickname!=='string'||!['','female','male'].includes(p.sex)||!['normal','pregnant','lactating'].includes(p.stage)||![p.age,p.height,p.weight].every(optional))throw Error('个人资料格式异常');return {nickname:p.nickname,age:p.age,sex:p.sex,stage:p.stage,height:p.height,weight:p.weight}
}
