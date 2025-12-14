require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generateSchema", async (req, res) => {
  const { prompt } = req.body;
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            "You are a JSON-only form-schema generator. Output ONLY valid JSON and nothing else (no comments, no extra keys).",
            "Output MUST follow this exact compact form schema shape:",
            "{",
            '  "title": string,',
            '  "fields": [',
            "    {",
            '      "type": "text" | "number" | "radio" | "checkbox" | "select" | "multiselect",',
            '      "label": string,',
            '      "name": string,',
            '      "required": boolean,',
            '      "options": [string],',
            '      "conditions": { "<optionValue>": [ <field objects, same shape> ] }',
            "    }",
            "  ]",
            "}",
            "IMPORTANT: Every generated schema MUST include conditional logic. At least one field must have a 'conditions' object.",
            "REQUIREMENT: At least one conditional branch MUST contain a field that itself has a 'conditions' object (i.e., nested/recursive conditions, depth >= 2).",
            "Names MUST be snake_case and machine safe.",
            "Options used inside 'conditions' MUST exactly match the parent field's 'options' values.",
            "Do NOT include JSON Schema keywords such as: properties, type: object, $schema, required: [].",
            "Do NOT include markdown, code fences, comments, or explanations.",
            "Output MUST be parseable JSON only.",
          ].join(" "),
        },
        {
          role: "user",
          content:
            "Example: create a short patient intake schema demonstrating nested conditional logic.",
        },
        {
          role: "assistant",
          content: JSON.stringify({
            title: "Comprehensive Intake (example)",
            fields: [
              {
                type: "text",
                label: "Full Name",
                name: "full_name",
                required: true,
              },
              {
                type: "number",
                label: "Age",
                name: "age",
                required: true,
              },
              {
                type: "select",
                label: "Department",
                name: "department",
                options: ["Cardiology", "Dentistry", "General"],
                required: true,
                conditions: {
                  Cardiology: [
                    {
                      type: "radio",
                      label: "Do you have chest pain?",
                      name: "chest_pain",
                      options: ["Yes", "No"],
                      required: true,
                      conditions: {
                        Yes: [
                          {
                            type: "text",
                            label: "Pain description",
                            name: "pain_description",
                            required: true,
                          },
                          {
                            type: "radio",
                            label: "Is pain exertional?",
                            name: "pain_exertional",
                            options: ["Yes", "No"],
                            conditions: {
                              Yes: [
                                {
                                  type: "number",
                                  label: "Minutes from onset to relief",
                                  name: "pain_relief_minutes",
                                  required: true,
                                },
                              ],
                              No: [],
                            },
                          },
                        ],
                        No: [],
                      },
                    },
                    {
                      type: "checkbox",
                      label: "Cardio History",
                      name: "cardio_history",
                      options: ["Hypertension", "Arrhythmia", "Heart Attack"],
                      required: false,
                    },
                  ],
                  Dentistry: [
                    {
                      type: "checkbox",
                      label: "Oral Symptoms",
                      name: "oral_symptoms",
                      options: ["Toothache", "Bleeding", "Sensitivity"],
                      required: true,
                    },
                    {
                      type: "text",
                      label: "Last dental visit (notes)",
                      name: "last_dental_visit",
                      required: false,
                    },
                  ],
                  General: [],
                },
              },
              {
                type: "multiselect",
                label: "Preferred Contact Methods",
                name: "contact_methods",
                options: ["Email", "Phone", "SMS"],
                required: false,
              },
              {
                type: "radio",
                label: "Are you diabetic?",
                name: "is_diabetic",
                options: ["Yes", "No"],
                required: true,
                conditions: {
                  Yes: [
                    {
                      type: "number",
                      label: "Duration (years)",
                      name: "diabetes_duration",
                      required: true,
                    },
                    {
                      type: "radio",
                      label: "Do you take insulin?",
                      name: "takes_insulin",
                      options: ["Yes", "No"],
                      conditions: {
                        Yes: [
                          {
                            type: "number",
                            label: "Daily units",
                            name: "daily_units",
                            required: true,
                          },
                        ],
                        No: [],
                      },
                    },
                  ],
                  No: [],
                },
              },
              {
                type: "text",
                label: "Additional Notes",
                name: "additional_notes",
                required: false,
              },
            ],
          }),
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    // Get the model message (sdk may place parsed JSON under message.parsed)
    const msg = completion.choices?.[0]?.message ?? completion.choices?.[0];

    if (!msg) {
      console.error("No message in completion:", completion);
      return res.status(500).json({ error: "No model response", completion });
    }
    if (msg.parsed) {
      return res.json(msg.parsed);
    }

    const raw = (msg.content ?? "").trim();
    try {
      const json = JSON.parse(raw);
      return res.json(json);
    } catch (parseErr) {
      console.error("Failed to parse model output as JSON:", raw);
      return res
        .status(500)
        .json({ error: "Model did not return valid JSON", raw });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate schema" });
  }
});

module.exports = app;