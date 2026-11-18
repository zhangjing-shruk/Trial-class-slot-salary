export const CONVERSION_BONUS_OPTIONS=[
 {value:'60EGP',amount:60,currency:'EGP',label:'60 EGP'},
 {value:'50EGP',amount:50,currency:'EGP',label:'50 EGP'},
 {value:'1.5JOD',amount:1.5,currency:'JOD',label:'1.5 JOD'},
];
export function validateConversionBonus(value,currency){
 if(!value)return null;
 const option=CONVERSION_BONUS_OPTIONS.find(o=>o.value===value);
 if(!option)throw Error('请选择有效的转化奖励标准。');
 if(option.currency!==currency)throw Error('转化奖励币种必须与老师工资币种一致。');
 return option;
}
// The operator explicitly chose to apply the selected rate to all historical purchases.
export function conversionBonusFor(data,teacher,date,convertedOverride){
 const converted=Number(convertedOverride??data.conversions?.[`${teacher.id}:${date}`]?.converted??0);
 if(!Number.isSafeInteger(converted)||converted<0)throw Error('转化数必须为非负整数。');
 const option=validateConversionBonus(teacher.conversionBonus,teacher.currency);
 return {converted,conversionBonusRate:option?.amount||0,conversionBonusOption:option?.label||'',conversionBonus:Math.round((option?.amount||0)*1000)*converted/1000};
}
