# Part 129 Import Formats

## CSV

One dataset per CSV file:

- branches
- courses
- teachers
- classes
- students
- parents
- staff

Use the included templates. Pipe `|`, comma or semicolon can separate list fields such as `branchRefs` and `subjects`.

## JSON array

Select a dataset type and upload an array:

```json
[
  {
    "branchName": "North Branch",
    "branchCode": "NORTH"
  }
]
```

## Linked JSON package

Select `Linked JSON Package` and upload an object containing arrays. Import order is:

```text
Branches → Courses → Teachers → Classes → Students → Parents → Staff
```

References may use codes/identifiers created earlier in the same package.
