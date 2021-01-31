# IONDV. Freight Quote
## Description

IONDV. Freight Quote is a software solution to search for and display information on freight rates of different freight companies or aggregators.  It makes a query to several freight websites, collects data and displays it, allowing to compare rates of different companies for shipping the equal load.

The demo version app makes queries to the real freight sites and shows the actual quotes for shipping cargo. A user inserts dimensions of the cargo and such postal information as pickup and delivery localities in the system and gets png/pdf results with different freights companies terms. The queries are implemented using Puppeteer library. Such implementation principle may be used to many other examples of apps for collecting data from websites and displaying the results. The demo version is created to demonstrate this process and the system can be developed into a beautiful and responsive web-app that suits your goals.

<h1 align="center"> <img src="/iondv-freight-quote.jpg" alt="IONDV. Freight Quote" align="center"></h1>  

## Demo

Watch a brief video https://www.youtube.com/watch?v=-2IfSOecc_w

Demo access to view the system without registration: https://freight-quote.iondv.ru/

Login: **demo**, password: **ion-demo**.

Additional advantages:
- Open source code for all system components – https://github.com/iondv/freight-quote;
- Open software used for DBMS and server OS (running for linux and windows);
- Any adaptation and modernization of the system is available, including data structures modernization without programming in a visual editor. You can try it by downloading the zip archive of the repository in the editor at https://studio.iondv.com. The UML schema is deployed into a working application in 80 seconds, see the [video]( https://youtu.be/s7q9_YXkeEo)
- Launch your own version in a few minutes – see [How to get](#how-to-get)

## How to get?

### IONDV. Studio sandbox
Check and build the application in the [IONDV. Studio](https://studio.iondv.com) sandbox.
1. Download the archive file from GitHub
2. Open it in the Studio
3. Click the “play” button
4. Get the link and open it

Watch [How-To video](https://www.youtube.com/watch?v=s7q9_YXkeEo).   

If necessary, make changes to the data structure and rebuild the application.

The application can be saved and deployed locally in the other methods described below.

### Git

Quick start using the **IONDV. Freight Quote** repository on GitHub – detailed instruction.
1. Install the system environment and global dependencies according to the instructions from https://iondv.readthedocs.io/en/latest/.
2. Clone the core, module, and application.
3. Build and deploy the app.
4. Launch the application.

Or install and run in a single line with Linux using the iondv-app installer (locally required node.js, MongoDB and Git):
```
curl -L -s https://github.com/iondv/iondv-app/archive/master.zip > iondv-app.zip &&\
  unzip -p iondv-app.zip iondv-app-master/iondv-app > iondv-app &&\
  bash iondv-app -t git -q -i -m localhost:27017 freight-quote
  ```

Where instead of `localhost:27017` specify MongoDb adress. After the launch open the link 'http://localhost:8888', back-office account login: **demo**, password: **ion-demo**.

### Docker
Launching an application using a docker container.

1. Launch the mongodb DBMS: `docker run --name mongodb -v mongodb_data:/data/db -p 27017:27017 -d mongo` 
2. Launch the IONDV. CRM-en `docker run -d -p 80:8888 --link mongodb iondv/freight-quote`. 
3. Open the link `http://localhost` in the browser in a minute (it takes time to initialize data). For the back-office the login is: **demo**, password: **ion-demo** 

## Links
For more information, see the following resources:
- [IONDV. Framework](https://iondv.com/) 
- [Facebook](https://www.facebook.com/iondv/) 
