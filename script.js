const STORAGE_KEY = "nido_goals_v1";
let goals = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let editingId = null, depositingId = null;
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n || 0);

function save(){
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(goals)); render(); }
  catch(err){ notify("No hay suficiente espacio para guardar. Prueba con una foto más pequeña."); }
}
function render(){
  const totalSaved=goals.reduce((s,g)=>s+g.saved,0), totalTarget=goals.reduce((s,g)=>s+g.target,0);
  $("totalSaved").textContent=money(totalSaved);$("totalTarget").textContent=money(totalTarget);$("goalCount").textContent=goals.length;
  $("emptyState").style.display=goals.length?"none":"block";
  $("goalsList").innerHTML=goals.map(g=>{
    const pct=Math.min(100,Math.round(g.saved/g.target*100)), remaining=Math.max(0,g.target-g.saved);
    const visual=g.photo?`<img src="${g.photo}" alt="Foto de ${escapeHtml(g.name)}">`:"✧";
    return `<article class="goal-card"><div class="goal-top"><div class="goal-symbol">${visual}</div><div class="goal-actions"><button class="icon-btn" title="Editar" onclick="editGoal('${g.id}')">✎</button><button class="icon-btn" title="Eliminar" onclick="deleteGoal('${g.id}')">×</button></div></div><h3>${escapeHtml(g.name)}</h3><div class="goal-sub">Mi próximo gran logro</div><div class="progress-row"><span>Progreso</span><strong>${pct}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="goal-bottom"><div><strong>${money(g.saved)}</strong><br><small>${remaining?`Faltan ${money(remaining)}`:"¡Meta alcanzada!"}</small></div><button class="deposit-btn" onclick="openDeposit('${g.id}')">＋ Ahorrar</button></div></article>`;
  }).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function resetPhotoFields(){
  $("goalPhoto").value="";$("photoPreviewWrap").hidden=true;$("photoPreview").removeAttribute("src");
  $("removePhotoWrap").hidden=true;$("removePhoto").checked=false;
}
function openModal(){editingId=null;$("goalForm").reset();$("goalSaved").value=0;resetPhotoFields();$("modalTitle").textContent="Crear una meta";$("modalBackdrop").classList.add("show")}
function closeModal(){$("modalBackdrop").classList.remove("show")}
function editGoal(id){
  const g=goals.find(x=>x.id===id);if(!g)return;
  editingId=id;$("goalName").value=g.name;$("goalTarget").value=g.target;$("goalSaved").value=g.saved;
  resetPhotoFields();
  if(g.photo){$("photoPreview").src=g.photo;$("photoPreviewWrap").hidden=false;$("removePhotoWrap").hidden=false;}
  $("modalTitle").textContent="Editar mi meta";$("modalBackdrop").classList.add("show");
}
function deleteGoal(id){const g=goals.find(x=>x.id===id);if(g&&confirm(`¿Eliminar la meta "${g.name}"? Esta acción no se puede deshacer.`)){goals=goals.filter(x=>x.id!==id);save();notify("Meta eliminada")}}
function openDeposit(id){depositingId=id;const g=goals.find(x=>x.id===id);$("depositGoalName").textContent=g.name;$("depositAmount").value="";$("depositBackdrop").classList.add("show");setTimeout(()=>$("depositAmount").focus(),100)}
function notify(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}

function compressImage(file){
  return new Promise((resolve,reject)=>{
    if(!file.type.startsWith("image/"))return reject(new Error("Selecciona un archivo de imagen."));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("No se pudo leer la imagen."));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("No se pudo abrir la imagen."));
      img.onload=()=>{
        const max=900, scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement("canvas");
        canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",0.78));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

$("goalPhoto").addEventListener("change",async()=>{
  const file=$("goalPhoto").files[0];if(!file)return;
  try{$("photoPreview").src=await compressImage(file);$("photoPreviewWrap").hidden=false;}
  catch(err){notify(err.message);$("goalPhoto").value="";}
});
$("removePhoto").addEventListener("change",()=>{if($("removePhoto").checked){$("photoPreviewWrap").hidden=true;$("goalPhoto").value="";}});
$("openModal").onclick=openModal;$("emptyCreate").onclick=openModal;$("closeModal").onclick=closeModal;$("closeDeposit").onclick=()=>$("depositBackdrop").classList.remove("show");
$("goGoals").onclick=()=>$("goalsSection").scrollIntoView({behavior:"smooth"});
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal()});
$("depositBackdrop").addEventListener("click",e=>{if(e.target===$("depositBackdrop"))$("depositBackdrop").classList.remove("show")});

$("goalForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const name=$("goalName").value.trim(),target=Number($("goalTarget").value),saved=Number($("goalSaved").value);
  if(!name||target<=0||saved<0||!Number.isFinite(target)||!Number.isFinite(saved))return notify("Revisa los valores ingresados");
  const old=editingId?goals.find(x=>x.id===editingId):null;
  let photo=old?.photo||"";
  if($("removePhoto").checked)photo="";
  const file=$("goalPhoto").files[0];
  if(file){try{photo=await compressImage(file)}catch(err){return notify(err.message)}}
  const item={id:editingId||((crypto.randomUUID&&crypto.randomUUID())||String(Date.now())),name,target,saved,photo};
  if(editingId){const i=goals.findIndex(x=>x.id===editingId);goals[i]=item}else goals.unshift(item);
  const wasEditing=Boolean(editingId);save();closeModal();notify(wasEditing?"Meta actualizada":"¡Tu meta ya está en NIDO!");
});
$("depositForm").addEventListener("submit",e=>{e.preventDefault();const amount=Number($("depositAmount").value),g=goals.find(x=>x.id===depositingId);if(!g||amount<=0||!Number.isFinite(amount))return notify("Ingresa un valor válido");g.saved+=amount;save();$("depositBackdrop").classList.remove("show");notify("¡Ahorro registrado! Vas muy bien")});
render();
if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
