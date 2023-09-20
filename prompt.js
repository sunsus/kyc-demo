

const systemPrompt = `
    Please take the text below and extract the following data:

    {text}
    
    Target structure:
   
    {{
        "fullName": "The full name of the person as 'FirstName LastName'",
        "dateOfBirth": "dd.mm.yyyy",
        "relationshipStatus": "married, single, etc. "
        "relationships": [
            {{
                "relation": "daughter, husband, etc.",
                "fullName": "The full name of the person as 'FirstName LastName",
                "dateOfBirth": "dd.mm.yyyy",
                "dateOfDeath": "dd.mm.yyyy"
            }}
        ]
    }}

    Names should always be displayed as "Firstname Lastname"
    Feel free to fix any typos. 
    Add an additional top-level property "remarks" for additional information and hints that do not fit the other properties. 
    If you find any irregularities or contradictions, please add them to the "remarks" property as well.
    Your response must only contain the JSON object and nothing else!
`

export { systemPrompt }