export const teacherLabel=teacher=>`${teacher?.name||''}${String(teacher?.teacherId??'').trim()}`;
export const activeTeachers=data=>(data.teachers||[]).filter(t=>!t.deletedAt);
export function deleteTeacher(data,id,confirmation){
 const teacher=data.teachers.find(t=>t.id===id&&!t.deletedAt);
 if(!teacher)throw Error('老师档案不存在或已删除。');
 if(confirmation.trim()!==teacherLabel(teacher))throw Error('请输入完整的老师姓名及 ID 以确认删除。');
 teacher.deletedAt=new Date().toISOString();
 return teacher;
}
