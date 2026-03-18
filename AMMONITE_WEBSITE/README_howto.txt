AMMONITE WEBSITE VADE MECUM

HOW TO ADD A NEW PROJECT

STEP 1: CREATE THE FOLDER
Go into the "projects" folder.
Create a new folder. Name it something simple (lowercase, no spaces).
Example: "museum_paris"

STEP 2: ADD IMAGES
Put your images inside that folder.

OPTION A (Easy): Name them "1.jpg", "2.jpg", "3.jpg", etc.
"1.jpg" will always be the Main Display image.

OPTION B (Mixed Formats): You can use .png or .gif, just keep the names simple.

STEP 3: CREATE INFO.TXT
Create a file named "info.txt" inside the folder.
Copy-paste this structure:

NAME: MUSEUM OF LIGHT
LOCATION: PARIS, FR
YEAR: 2026
TYPE: CULTURAL
CATEGORY: arch
IMAGES: 3
DESCRIPTION: Your long text goes here.

*CATEGORY options: arch, research, photo
*IMAGES: Put the total number (e.g., 5) if using numbered jpgs.
OR list filenames: "cover.png, view.jpg, loop.gif"

STEP 4: UPDATE THE CODE (IF NOT USING PYTHON)
If you run the site using `python server.py`, there is NO further code to update! The filesystem is fully dynamic.
However, if you are using VS Code Live Server, GitHub Pages, or a standard web host, you MUST add the new folder name to `projects.js`.

HOW TO EDIT AN EXISTING PROJECT

Go to the project folder (e.g., "projects/casa_lc").

To change text: Open "info.txt", change the text, save.

To change images: Overwrite "1.jpg" with a new file of the same name.

TROUBLESHOOTING & PREVIEWING

IMPORTANT:
Because this site uses a smart file loader, you cannot just double-click "index.html" to see new projects. Chrome/Safari blocks it for security.

TO PREVIEW CHANGES:

VS Code: Right-click index.html -> "Open with Live Server".

Python (Mac/Terminal): Type "python -m http.server" in the folder.

Or simply upload to your web host; it will work immediately online.

IMAGE SIZES

Keep images under 500KB if possible.

Width: 1500px - 2000px is perfect for full screen.

Vertical images work, but landscape fills the screen better.