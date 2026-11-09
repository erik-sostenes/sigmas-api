curl -X GET localhost:8080/api/v1/components
[
{
  "id": 1,
  "code": "C1",
  "name": "component 4",
  "unit_administrative": {
    "id": "12345",
    "code": "4000",
    "name": "Subdirección de Planeación"
  }
},
{
  "id": 2,
  "code": C2",
  "name": "component 4",
  "unit_administrative": {
    "id": "12345",
    "code": "4000",
    "name": "Subdirección de Planeación"
  }
}
]
# SELECT c.id, c.code FROM components as c;


# localhost:8080/api/v1/activities/1
curl -X GET localhost:8080/api/v1/activities/:component_id
[
  {"id": "", "code": "C1_A1", "name": "activity 1"},
  {"id": "1234", "code": "ABD", "name": "activity 1"}
]

# SELECT * FROM activities WHERE component_id  = $component_id

curl -X GET localhost:8080/api/v1/funding_sources
[
{}, {}, {} 
]


curl -X GET localhost:8080/api/v1/deparments
[
{
  "id": "",
  "name": ""
},
{
  "id": "",
  "name": ""
}
]
