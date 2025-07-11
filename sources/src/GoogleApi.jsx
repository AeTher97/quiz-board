import {useEffect, useState} from 'react';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const CLIENT_ID = "44636040261-9sh9aqhih4uvtg200052ih866tf7qi02.apps.googleusercontent.com";
const API_KEY = "AIzaSyCbKopBrr0E-HCpYjGViThChgb9B4XNeP8";
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'].join(" ");

const tokenExpired = () => {
    return !localStorage.getItem("tokenExpiration") || Number(localStorage.getItem("tokenExpiration")) < new Date().getTime();
}

const useGoogleApi = () => {

    const [gapiClientInitialized, setGapiClientInitialized] = useState(false);
    const [tokenClient, setTokenClient] = useState();
    const [loggedIn, setLoggedIn] = useState(localStorage.getItem("loggedIn"));

    const [quizFiles, setQuizFiles] = useState([]);
    const [quizFilesLoading, setQuizFilesLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [folderId, setFolderId] = useState("");

    useEffect(() => {

        google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: () => {
                setLoggedIn(true);
                localStorage.setItem("loggedIn", true);
            }
        })
        google.accounts.id.renderButton(
            document.getElementById("topDiv"),
            {theme: "outline", size: "large", shape: "pill"}
        )
        google.accounts.id.prompt();
        gapi.load('client', initializeGapiClient);
    }, [])


    async function initializeGapiClient() {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        setGapiClientInitialized(true);
        const newTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: () => {
                console.log("init")
            },
        })
        if (localStorage.getItem("accessToken") && !tokenExpired()) {
            gapi.client.setToken({access_token: localStorage.getItem("accessToken")});
        }
        setTokenClient(newTokenClient)
    }

    const setToken = (resp) => {
        localStorage.setItem("accessToken", resp.access_token);
        localStorage.setItem("tokenExpiration", new Date().getTime() + (resp.expires_in - 100) * 1000);
        gapi.client.setToken({access_token: resp.access_token});

    }

    function executeWithGoogleAuth(callback) {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            setToken(resp);
            await callback();
        };

        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else if (tokenExpired()) {
            tokenClient.requestAccessToken({prompt: ''});
        } else {
            callback();
        }
    }

    const browseQuizFiles = async () => {
        setQuizFilesLoading(true);
        executeWithGoogleAuth(browseFiles)
    }

    const browseFiles = async () => {
        try {
            let folderResponse = await gapi.client.drive.files.list({
                'pageSize': 10,
                'fields': 'files(id, name)',
                'q': 'mimeType = \'application/vnd.google-apps.folder\' and name = \'Quiz Board\''
            });
            let folderId;
            if (folderResponse.result.files.length === 0) {
                console.log("No Quiz Board folder, creating it");
                const createdFolderResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: 'Quiz Board',
                        mimeType: 'application/vnd.google-apps.folder',
                    },
                });
                folderId = createdFolderResponse.result.id;
            } else {
                folderId = folderResponse.result.files[0].id
            }
            setFolderId(folderId);
            const quizFilesList = await gapi.client.drive.files.list({
                'pageSize': 50,
                'fields': 'files(id, name)',
                'q': `'${folderId}' in parents and name contains '.quiz'`
            });
            setQuizFiles(quizFilesList.result.files);
            setQuizFilesLoading(false)
        } catch (err) {
            console.log(err)
        }
    }

    async function save(name, quizData) {
        setSaving(true)
        executeWithGoogleAuth(() => {
            const token = gapi.client.getToken().access_token;
            var formData = new FormData();
            var fileMetadata = {
                name: name + '.quiz',
                parents: [folderId]
            };
            formData.append("metadata", new Blob([JSON.stringify(fileMetadata)], {type: "application/json"}), {
                contentType: "application/json",
            });
            formData.append("data", new Blob([quizData], {type: "application/json"}), {
                filename: name,
                contentType: "text/plain",
            });
            fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
                method: "POST",
                body: formData,
                headers: {Authorization: "Bearer " + token},
            })
                .then((res) => res.json())
                .finally(() => setSaving(false));
        })
    }

    const openFile = async (id, callback) => {
        executeWithGoogleAuth(async () => {
            const token = gapi.client.getToken().access_token;
            const result = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
                headers: {Authorization: "Bearer " + token}
            })

            const reader = result.body.getReader()
            let json = ''
            while (true) {
                const {value, done} = await reader.read()
                if (value) {
                    json += new TextDecoder().decode(value)
                }
                if (done) {
                    break;
                }
            }
            callback(JSON.parse(json));
        })

    }

    return {loggedIn, save, quizFiles, browseQuizFiles, openFile, quizFilesLoading, saving, gapiClientInitialized}
};

export default useGoogleApi;