export const SAMPLE_A = { "$Value": { "Builders": [ { "ObjectBuilders": [ {"Value": {"$Type": "Sandbox.HierarchyComponentObjectBuilder", "Children": [
  {"Value": {"ObjectBuilders": [
    {"Value": {"$Type": "Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint": {"Transform": {"Position": {"X":0,"Y":0,"Z":0}}}}},
    {"Value": {"$Type": "Sandbox.CubeBlockObjectBuilder","Color": {"Values": {"X":0.0,"Y":1.0,"Z":1.0,"W":1}}}}
  ]}},
  {"Value": {"ObjectBuilders": [
    {"Value": {"$Type": "Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint": {"Transform": {"Position": {"X":2.5,"Y":0,"Z":0}}}}},
    {"Value": {"$Type": "Sandbox.CubeBlockObjectBuilder","Color": {"Values": {"X":0.3333,"Y":1.0,"Z":1.0,"W":1}}}}
  ]}},
  {"Value": {"ObjectBuilders": [
    {"Value": {"$Type": "Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint": {"Transform": {"Position": {"X":0,"Y":2.5,"Z":0}}}}},
    {"Value": {"$Type": "Sandbox.CubeBlockObjectBuilder","Color": {"Values": {"X":0.6667,"Y":1.0,"Z":1.0,"W":1}}}}
  ]}},
  {"Value": {"ObjectBuilders": [
    {"Value": {"$Type": "Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint": {"Transform": {"Position": {"X":2.5,"Y":2.5,"Z":0}}}}},
    {"Value": {"$Type": "Sandbox.CubeBlockObjectBuilder","Color": {"Values": {"X":0.15,"Y":1.0,"Z":1.0,"W":1}}}}
  ]}}
]}} ] } ] } };

export const SAMPLE_B = (() => {
  const children = [];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      children.push({
        "Value": {"ObjectBuilders": [
          {"Value": {"$Type": "Sandbox.ChildTransformComponentObjectBuilder",
            "TransformWithEulerHint": {"Transform": {"Position": {"X": x*2.5, "Y": y*2.5, "Z": 0}}}
          }},
          {"Value": {"$Type": "Sandbox.CubeBlockObjectBuilder",
            "Color": {"Values": {"X": (x/3), "Y": 0.8, "Z": Math.max(0.4, y/2), "W": 1 }}
          }}
        ]}}
      );
    }
  }
  return { "$Value": { "Builders": [ { "ObjectBuilders": [ { "Value": { "$Type": "Sandbox.HierarchyComponentObjectBuilder", "Children": children } } ] } ] } };
})();

export const SAMPLE_C = (() => {
  const children = [];
  for (let i=0;i<5;i++) children.push({"Value":{"ObjectBuilders":[
    {"Value": {"$Type":"Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint": {"Transform": {"Position": {"X": i*2.5, "Y": 0, "Z": 0}}}}},
    {"Value": {"$Type":"Sandbox.CubeBlockObjectBuilder","Color": {"Values": {"X":0.0,"Y":1,"Z":1,"W":1}}}}
  ]}});
  for (let i=0;i<5;i++) children.push({"Value":{"ObjectBuilders":[
    {"Value": {"$Type":"Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint": {"Transform": {"Position": {"X": i*0.5, "Y": 3, "Z": 0}}}}},
    {"Value": {"$Type":"Sandbox.CubeBlockObjectBuilder","Color": {"Values": {"X":0.3333,"Y":1,"Z":1,"W":1}}}}
  ]}});
  for (let i=0;i<5;i++) children.push({"Value":{"ObjectBuilders":[
    {"Value": {"$Type":"Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint": {"Transform": {"Position": {"X": i*0.25, "Y": 6, "Z": 0}}}}},
    {"Value": {"$Type":"Sandbox.CubeBlockObjectBuilder","Color": {"Values": {"X":0.6667,"Y":1,"Z":1,"W":1}}}}
  ]}});
  return { "$Value": { "Builders": [ { "ObjectBuilders": [ { "Value": { "$Type": "Sandbox.HierarchyComponentObjectBuilder", "Children": children } } ] } ] } };
})();

// D: selection stress test — 2x2x2 block with distinct hues
export const SAMPLE_D = (() => {
  const children=[]; let idx=0; const hues=[0,0.16,0.33,0.5,0.66,0.83,0.1,0.75];
  for(let z=0;z<2;z++) for(let y=0;y<2;y++) for(let x=0;x<2;x++) children.push({"Value":{"ObjectBuilders":[
    {"Value": {"$Type":"Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint": {"Transform": {"Position": {"X": x*2.5, "Y": y*2.5, "Z": z*2.5}}}}},
    {"Value": {"$Type":"Sandbox.CubeBlockObjectBuilder","Color": {"Values": {"X":hues[idx++],"Y":1,"Z":1,"W":1}}}}
  ]}});
  return { "$Value": { "Builders": [ { "ObjectBuilders": [ { "Value": { "$Type": "Sandbox.HierarchyComponentObjectBuilder", "Children": children } } ] } ] } };
})();

// E: cylindrical frame + noise test
export const SAMPLE_E = (() => {
  const children=[];
  const step=2.5; const R=10; const ZL=-5, ZH=5;
  for(let z=ZL; z<=ZH; z+=step){
    for(let x=-R; x<=R; x+=step){
      for(let y=-R; y<=R; y+=step){
        const dist = Math.hypot(x, y);
        if (Math.abs(dist - R) < step*0.6) {
          children.push({"Value":{"ObjectBuilders":[
            {"Value":{"$Type":"Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint":{"Transform":{"Position":{"X":x,"Y":y,"Z":z}}}}},
            {"Value":{"$Type":"Sandbox.CubeBlockObjectBuilder","Color":{"Values":{"X":0.0,"Y":0.0,"Z":0.8,"W":1}}}}
          ]}});
        }
      }
    }
  }
  return { "$Value": { "Builders": [ { "ObjectBuilders": [ { "Value": { "$Type": "Sandbox.HierarchyComponentObjectBuilder", "Children": children } } ] } ] } };
})();
