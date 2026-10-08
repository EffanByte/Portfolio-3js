const SOURCE_SVGS = {"globe":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n  <path d=\"M6 2h12v2H6zm0 18h12v2H6zM4 4h2v2H4zm5 0h2v2H9zm0 14h2v2H9zm4 0h2v2h-2zM7 6h2v12H7zm8 0h2v12h-2zm-2-2h2v2h-2zm7 0h-2v2h2zM2 6h2v12H2zm20 0h-2v12h2zM4 18h2v2H4zm16 0h-2v2h2z\"/>\n  <path d=\"M3 11h18v2H3z\"/>\n</svg>\n","article":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n  <path d=\"M8 2h12v2H8zM6 4h2v16H6zm14 0h2v16h-2zM4 20h16v2H4zm-2-9h2v9H2zm2-2h2v2H4zm6-3h8v2h-8zm0 4h8v2h-8zm0-2h2v2h-2zm6 0h2v2h-2zm-6 5h8v2h-8zm0 3h4v2h-4z\"/>\n</svg>\n","mic":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n  <path d=\"M10 2h4v2h-4zM8 4h2v10H8zm2 10h4v2h-4zm4-10h2v10h-2zM4 10h2v6H4zm2 6h2v2H6zm2 2h8v2H8zm8-2h2v2h-2zm2-6h2v6h-2zm-7 10h2v2h-2z\"/>\n</svg>\n","phone":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n  <path d=\"M4 1h5v2H4zm5 2h2v4H9zM7 7h2v4H7zm-3 5h2v2H4zM2 3h2v9H2zm7 8h2v2H9zm2 2h2v2h-2zm2 2h4v2h-4zm4-2h4v2h-4zm4 2h2v5h-2zM6 14h2v2H6zm2 2h2v2H8zm2 2h2v2h-2zm2 2h9v2h-9z\"/>\n</svg>\n","chevron-left":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n  <path d=\"M8 13v-2h2v2H8Zm2-2V9h2v2h-2Zm0 4v-2h2v2h-2Zm2-6V7h2v2h-2Zm0 8v-2h2v2h-2Zm2-10V5h2v2h-2Zm0 12v-2h2v2h-2Z\"/>\n</svg>\n","chevron-right":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n  <path d=\"M16 13v-2h-2v2h2Zm-2-2V9h-2v2h2Zm0 4v-2h-2v2h2Zm-2-6V7h-2v2h2Zm0 8v-2h-2v2h2ZM10 7V5H8v2h2Zm0 12v-2H8v2h2Z\"/>\n</svg>\n","sparkle":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n  <path d=\"M11 1h2v4h-2zm0 22h2v-4h-2zM9 5h2v4H9zm0 14h2v-4H9zm4-14h2v4h-2zm0 14h2v-4h-2zM5 9h4v2H5zm14 0h-4v2h4zM1 11h4v2H1zm22 0h-4v2h4zM5 13h4v2H5zm14 0h-4v2h4z\"/>\n</svg>\n"};
// Run through Figma's use_figma MCP tool on an empty page.
const page = await figma.getNodeByIdAsync('0:1');
await figma.setCurrentPageAsync(page);
if (page.children.some(node => node.name.startsWith('Arcade menu /'))) {
  throw new Error('Arcade menu already exists. Inspect existing nodes before rebuilding.');
}
await Promise.all(['Regular', 'Medium', 'SemiBold', 'Bold'].map(style =>
  figma.loadFontAsync({ family: 'Pixelify Sans', style })));

const colorHex = {
  ink: '#163c5b', muted: '#466b85', sky: '#bfe3f7', paper: '#effaff',
  blue: '#306da0', ice: '#d8efff', shadow: '#8fb7d2', panelShadow: '#9ec9e3',
  divider: '#b7d8eb', sparkle: '#6caad1', keyBorder: '#608aa5', keyFill: '#d9effb'
};
const rgb = hex => ({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
const collection = figma.variables.createVariableCollection('Arcade / Light blue');
collection.renameMode(collection.defaultModeId, 'Light');
const colors = {};
for (const [name, hex] of Object.entries(colorHex)) {
  const variable = figma.variables.createVariable(`color/${name}`, collection, 'COLOR');
  variable.scopes = ['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR','EFFECT_COLOR'];
  variable.setValueForMode(collection.defaultModeId, rgb(hex));
  variable.setVariableCodeSyntax('WEB', `--arcade-${name}`);
  colors[name] = variable;
}
const paint = name => figma.variables.setBoundVariableForPaint({type:'SOLID',color:rgb(colorHex[name])}, 'color', colors[name]);
const shadow = (name, x, y) => ({type:'DROP_SHADOW',color:{...rgb(colorHex[name]),a:1},offset:{x,y},radius:0,spread:0,visible:true,blendMode:'NORMAL'});
const styles = {};
for (const [name, size, lineHeight, weight] of [
  ['Title',40.26,42.265625,'SemiBold'],['Eyebrow',14,17,'Medium'],
  ['Tile label',19,19,'Medium'],['Status',17,21,'Medium'],
  ['Caption',15,18,'Medium'],['Summary',18,21.59375,'Regular'],['Tile number',12,14,'Regular']
]) {
  const style=figma.createTextStyle(); style.name=`Arcade / ${name}`;
  style.fontName={family:'Pixelify Sans',style:weight}; style.fontSize=size;
  style.lineHeight={unit:'PIXELS',value:lineHeight};
  if (name==='Eyebrow') style.letterSpacing={unit:'PIXELS',value:2};
  styles[name]=style;
}
const effectStyle=figma.createEffectStyle(); effectStyle.name='Arcade / Floating panel';
effectStyle.effects=[shadow('panelShadow',11,11),shadow('ink',6,6)];

function layout(name, direction, parent, width, height) {
  const node=figma.createAutoLayout(direction);
  node.name=name; node.fills=[]; node.clipsContent=false;
  if(parent)parent.appendChild(node);
  if(width !== undefined)node.resize(width,height ?? node.height);
  if(height === undefined)node.primaryAxisSizingMode='AUTO';
  node.counterAxisAlignItems='CENTER';
  return node;
}
function text(parent, name, characters, style, color='ink') {
  const node=figma.createText(); node.name=name;
  node.fontName=styles[style].fontName;
  node.textStyleId=styles[style].id;
  node.characters=characters; node.fills=[paint(color)];
  parent.appendChild(node);
  return node;
}
function stroke(node, weight=2, color='ink') {
  node.strokes=[paint(color)]; node.strokeWeight=weight; node.strokeAlign='INSIDE';
  node.strokesIncludedInLayout=false;
}
const iconMasters={};
const iconShelf=layout('Assets / Pixelarticons','HORIZONTAL',page);
iconShelf.x=200; iconShelf.y=1240; iconShelf.itemSpacing=24;
for (const name of Object.keys(SOURCE_SVGS)) {
  const svg=figma.createNodeFromSvg(SOURCE_SVGS[name].replaceAll('currentColor',colorHex.ink));
  svg.resize(48,48);
  const component=figma.createComponentFromNode(svg);
  component.name=`Icon / ${name}`;
  component.description='Unmodified MIT Pixelarticons source. Swap this instance to change the icon.';
  iconShelf.appendChild(component);
  iconMasters[name]=component;
}
function icon(parent,name,size,color='ink') {
  const node=iconMasters[name].createInstance(); parent.appendChild(node);
  node.name=`Icon / ${name}`; node.resize(size,size);
  for (const vector of node.findAllWithCriteria({types:['VECTOR']})) {
    vector.fills=[paint(color)];
  }
  return node;
}

const tileVariants=[];
let tileProperties;
for (const [state, selected, hover] of [
  ['Default',false,false],['Hover',false,true],['Selected',true,false],['Selected hover',true,true]
]) {
  const node=figma.createComponent(); node.name=`State=${state}`;
  node.layoutMode='VERTICAL'; node.resize(120,134);
  node.primaryAxisAlignItems='CENTER'; node.counterAxisAlignItems='CENTER';
  node.paddingTop=16; node.paddingBottom=14; node.paddingLeft=6; node.paddingRight=6;
  node.itemSpacing=12; node.clipsContent=false;
  node.fills=[paint(selected?'blue':'ice')]; stroke(node);
  node.effects=[shadow(selected?'ink':'shadow',3,hover?8:3)];
  const glyph=icon(node,'globe',48,selected?'paper':'ink');
  const label=text(node,'Label','Projects','Tile label',selected?'paper':'ink');
  const number=text(node,'Number','01','Tile number',selected?'paper':'ink');
  number.layoutPositioning='ABSOLUTE'; number.x=10; number.y=9; number.opacity=.7;
  const labelProperty=node.addComponentProperty('Label','TEXT','Projects');
  const numberProperty=node.addComponentProperty('Number','TEXT','01');
  const iconProperty=node.addComponentProperty('Icon','INSTANCE_SWAP',iconMasters.globe.id);
  label.componentPropertyReferences={characters:labelProperty};
  number.componentPropertyReferences={characters:numberProperty};
  glyph.componentPropertyReferences={mainComponent:iconProperty};
  if(!tileProperties)tileProperties={label:labelProperty,number:numberProperty,icon:iconProperty};
  node.description='Portfolio menu tile: 48px pixel icon, editable label and number. States match the HTML menu.';
  tileVariants.push(node);
}
const tileSet=figma.combineAsVariants(tileVariants,page);
tileSet.name='Arcade / Menu tile'; tileSet.x=200; tileSet.y=1340;
tileSet.layoutMode='HORIZONTAL'; tileSet.itemSpacing=24; tileSet.paddingLeft=16;tileSet.paddingRight=16;tileSet.paddingTop=16;tileSet.paddingBottom=16;
tileSet.primaryAxisSizingMode='AUTO';tileSet.counterAxisSizingMode='AUTO';
tileSet.fills=[paint('paper')];
await tileVariants[0].setReactionsAsync([{trigger:{type:'ON_HOVER'},actions:[{type:'NODE',destinationId:tileVariants[1].id,navigation:'CHANGE_TO',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.16}}]}]);
await tileVariants[2].setReactionsAsync([{trigger:{type:'ON_HOVER'},actions:[{type:'NODE',destinationId:tileVariants[3].id,navigation:'CHANGE_TO',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.16}}]}]);

const sectionNames=['Projects','Experience','About Me','Contact'];
const sectionIcons=['globe','article','mic','phone'];
const summaries=["Things I've built.",'My journey so far.','Meet the person behind the pixels.',"Let's start a conversation."];
const roots=[];

function makeScreen(selected,phase) {
  const root=layout(`Arcade menu / ${sectionNames[selected]} / Float ${phase===0?'down':'up'}`,'VERTICAL',page,610,530);
  root.x=200+selected*710;root.y=phase*580;
  root.fills=[paint('sky')];root.paddingLeft=24;root.paddingRight=24;root.paddingTop=24;root.paddingBottom=24;
  root.primaryAxisAlignItems='MIN';root.clipsContent=true;

  const header=layout('Status bar','HORIZONTAL',root,562,32);
  header.primaryAxisAlignItems='SPACE_BETWEEN';
  const identity=layout('Identity','HORIZONTAL',header);identity.itemSpacing=10;
  const name=text(identity,'Name','EFFAN','Status');name.fontName={family:'Pixelify Sans',style:'Bold'};
  text(identity,'Portfolio','/ PORTFOLIO','Status','muted');
  const credit=layout('Credit','HORIZONTAL',header);credit.paddingLeft=12;credit.paddingRight=12;credit.paddingTop=7;credit.paddingBottom=7;
  credit.fills=[paint('paper')];stroke(credit);credit.effects=[shadow('ink',2,2)];
  text(credit,'Credit count','1 CREDIT','Caption');

  const main=layout('Center stage','VERTICAL',root,562,426);
  main.layoutGrow=1;main.primaryAxisAlignItems='CENTER';main.counterAxisAlignItems='CENTER';
  main.paddingTop=phase===0?26:18;main.paddingBottom=phase===0?18:26;
  const panel=layout('Floating menu panel','VERTICAL',main,562);
  panel.paddingTop=27;panel.paddingBottom=21;panel.paddingLeft=23;panel.paddingRight=23;
  panel.counterAxisAlignItems='MIN';panel.fills=[paint('paper')];stroke(panel,3);
  panel.effectStyleId=effectStyle.id;

  const heading=layout('Panel heading','HORIZONTAL',panel,516,63.265625);
  heading.primaryAxisAlignItems='SPACE_BETWEEN';
  const titleGroup=layout('Heading copy','VERTICAL',heading);titleGroup.itemSpacing=4;titleGroup.counterAxisAlignItems='MIN';
  text(titleGroup,'Eyebrow','CHOOSE YOUR PATH','Eyebrow','muted');
  text(titleGroup,'Title','Hello, player.','Title');
  icon(heading,'sparkle',48,'sparkle');

  const grid=layout('Four-section menu','HORIZONTAL',panel,516,134);
  grid.itemSpacing=12;grid.y=heading.y+heading.height+24;
  // Spacer layers preserve the source's differing section gaps in Auto Layout.
  const headingGap=layout('Heading to tiles','VERTICAL',panel,516,24);
  panel.insertChild(panel.children.indexOf(grid),headingGap);
  const tileInstances=[];
  for(let i=0;i<4;i++) {
    const item=tileVariants[i===selected?2:0].createInstance();grid.appendChild(item);
    item.name=`Menu item / ${sectionNames[i]}`;
    const properties=Object.keys(item.componentProperties);
    const labelKey=properties.find(key=>key.startsWith('Label#'));
    const numberKey=properties.find(key=>key.startsWith('Number#'));
    const iconKey=properties.find(key=>key.startsWith('Icon#'));
    item.setProperties({[labelKey]:sectionNames[i],[numberKey]:String(i+1).padStart(2,'0'),[iconKey]:iconMasters[sectionIcons[i]].id});
    for(const vector of item.findAllWithCriteria({types:['VECTOR']})) {
      vector.fills=[paint(i===selected?'paper':'ink')];
    }
    tileInstances.push(item);
  }
  layout('Tiles to selection','VERTICAL',panel,516,22);
  const selection=layout('Selection bar','VERTICAL',panel,516,46);
  selection.counterAxisAlignItems='MIN';
  const divider=figma.createRectangle();selection.appendChild(divider);divider.name='Divider';divider.resize(516,2);divider.fills=[paint('divider')];
  const selectionGap=layout('Divider to controls','VERTICAL',selection,516,14);
  const details=layout('Section summary and controls','HORIZONTAL',selection,516,30);details.primaryAxisAlignItems='SPACE_BETWEEN';
  text(details,'Section description',summaries[selected],'Summary','muted');
  const steps=layout('Section controls','HORIZONTAL',details);steps.itemSpacing=8;
  function step(name, glyph) {
    const button=layout(name,'HORIZONTAL',steps,30,30);button.primaryAxisAlignItems='CENTER';button.fills=[paint('ice')];stroke(button);button.effects=[shadow('shadow',2,2)];icon(button,glyph,24);return button;
  }
  const previous=step('Previous section','chevron-left');
  const position=text(steps,'Section position',`${String(selected+1).padStart(2,'0')} / 04`,'Caption','muted');
  position.fontName={family:'Pixelify Sans',style:'Regular'};
  const next=step('Next section','chevron-right');

  const footer=layout('Keyboard hints','HORIZONTAL',root,562,24);footer.primaryAxisAlignItems='SPACE_BETWEEN';
  const choose=layout('Arrow keys','HORIZONTAL',footer);choose.itemSpacing=5;
  icon(choose,'chevron-left',24,'muted');icon(choose,'chevron-right',24,'muted');text(choose,'Choose hint','choose','Caption','muted');
  const enter=layout('Enter key hint','HORIZONTAL',footer);enter.itemSpacing=5;
  const key=layout('Enter key','HORIZONTAL',enter);key.paddingLeft=6;key.paddingRight=6;key.paddingTop=2;key.paddingBottom=2;key.fills=[paint('keyFill')];stroke(key,1,'keyBorder');text(key,'Key label','Enter','Caption','muted');
  text(enter,'Select hint','to select','Caption','muted');
  text(footer,'Explore hint','TAKE A LOOK AROUND','Caption','muted');
  return {root,panel,main,tileInstances,previous,next};
}

for(let selected=0;selected<4;selected++) roots.push([makeScreen(selected,0),makeScreen(selected,1)]);
const floatTransition={type:'SMART_ANIMATE',easing:{type:'EASE_IN_AND_OUT'},duration:2.4};
for(let selected=0;selected<4;selected++) {
  for(let phase=0;phase<2;phase++) {
    const screen=roots[selected][phase];
    await screen.root.setReactionsAsync([{trigger:{type:'AFTER_TIMEOUT',timeout:.001},actions:[{type:'NODE',destinationId:roots[selected][1-phase].root.id,navigation:'NAVIGATE',transition:floatTransition}]}]);
    for(let i=0;i<4;i++) {
      if(i===selected) continue;
      await screen.tileInstances[i].setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:roots[i][phase].root.id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.16}}]}]);
    }
    for(const [button,destination] of [[screen.previous,(selected+3)%4],[screen.next,(selected+1)%4]]) {
      await button.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:roots[destination][phase].root.id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.16}}]}]);
    }
  }
}
page.name='Pixel arcade menu';
page.flowStartingPoints=[{nodeId:roots[0][0].root.id,name:'Floating arcade menu'}];
const nodes=page.query('*').toArray();
const counts={};for(const node of nodes)counts[node.type]=(counts[node.type]||0)+1;
const fontFamilies=[...new Set(nodes.filter(n=>n.type==='TEXT').map(n=>n.fontName.family))];
const imageNodes=nodes.filter(n=>Array.isArray(n.fills)&&n.fills.some(fill=>fill.type==='IMAGE')).map(n=>({id:n.id,name:n.name}));
return {
  createdNodeIds:nodes.map(n=>n.id),mutatedNodeIds:[page.id],
  createdVariableIds:Object.values(colors).map(v=>v.id),collectionId:collection.id,
  styleIds:[...Object.values(styles).map(s=>s.id),effectStyle.id],
  primaryFrameId:roots[0][0].root.id,
  screens:roots.map(pair=>pair.map(screen=>({id:screen.root.id,name:screen.root.name,width:screen.root.width,height:screen.root.height,panel:{x:screen.panel.x,y:screen.panel.y,width:screen.panel.width,height:screen.panel.height}}))),
  tileSetId:tileSet.id,counts,fontFamilies,imageNodes,
  animation:'8px float loop, 4.8s total; hover and section selection use Smart Animate.'
};
