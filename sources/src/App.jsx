import React, {useEffect, useState} from 'react'
import './App.css'
import QuizTable from "./QuizTable.jsx";
import {
    Button,
    DialogContent,
    DialogTitle,
    Input,
    LinearProgress,
    Modal,
    ModalClose,
    ModalDialog,
    Typography
} from "@mui/joy";
import useGoogleApi from "./GoogleApi.jsx";
import ContentEditable from "react-contenteditable";
import {v4 as uuidv4} from 'uuid';

const sumTeamPoints = (team) => {
    return team.categoryPoints.map(pointObject => pointObject.points)
        .reduce((previousValue, currentValue) => previousValue + currentValue)
}

const distanceToPlayoff = (team, correctPlayoff) => {
    return Math.abs(team.playoff - correctPlayoff);
}

const EMPTY_TEAM = {
    id: 0,
    name: "",
    size: 0,
    categoryPoints: [{
        points: 0,
        filled: false
    }, {
        points: 0,
        filled: false
    }, {
        points: 0,
        filled: false
    }, {
        points: 0,
        filled: false
    }, {
        points: 0,
        filled: false
    }, {
        points: 0,
        filled: false
    }, {
        points: 0,
        filled: false
    }, {
        points: 0,
        filled: false
    }, {
        points: 0,
        filled: false
    },],
    playoff: 0
}

const compareTeams = (team1, team2, playoffValue) => {
    if (sumTeamPoints(team1) !== sumTeamPoints(team2)) {
        return sumTeamPoints(team2) - sumTeamPoints(team1);
    }

    if (distanceToPlayoff(team1, playoffValue) !== distanceToPlayoff(team2, playoffValue)) {
        return distanceToPlayoff(team1, playoffValue) - distanceToPlayoff(team2, playoffValue);
    }

    if (team1.size !== team2.size) {
        return team1.size - team2.size;
    }

    return 0;
}

function App() {

    const [loadOpen, setLoadOpen] = useState(false);
    const [playoffDialogOpen, setPlayoffDialogOpen] = useState(false);
    const [quizLoading, setQuizLoading] = useState(false);
    const [presenterView, setPresenterView] = useState(false);
    const [openedFileId, setOpenedFileId] = useState(null);
    const [tempPlayoffValue, setTempPlayoffValue] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [data, setData] = useState({
        correctPlayoff: 0, teams: [], playoffSet: false, name: "Quiz bez nazwy"
    });

    const {
        loggedIn,
        quizFiles,
        save,
        saveExistingFile,
        browseQuizFiles,
        openFile,
        quizFilesLoading,
        saving,
        gapiClientInitialized
    } = useGoogleApi();

    useEffect(() => {
        if (gapiClientInitialized && loggedIn) {
            browseQuizFiles()
        } else if (gapiClientInitialized && !loggedIn) {
            google.accounts.id.renderButton(
                document.getElementById("signInDiv"),
                {theme: "outline", size: "large", shape: "pill"}
            )
        }
    }, [gapiClientInitialized]);

    const cloneData = () => {
        return JSON.parse(JSON.stringify(data));
    }

    const setQuizName = (newName) => {
        setData(() => {
            const newData = cloneData();
            newData.name = newName;
            return newData;
        })
        document.title = newName;
    }

    const setTeamName = (id, name) => {
        setData(() => {
            const newData = cloneData();
            newData.teams[id].name = name;
            return newData;
        })
    }

    const setTeamSize = (id, size) => {
        setData(() => {
            const newData = cloneData();
            newData.teams[id].size = size;
            return newData;
        })
    }

    const setCategoryPoints = (id, categoryId, points) => {
        setData(() => {
            const newData = cloneData();
            newData.teams[id].categoryPoints[categoryId].points = points;
            newData.teams[id].categoryPoints[categoryId].filled = true;
            return newData;
        })
    }

    const setTeamPlayoff = (id, playoff) => {
        setData(() => {
            const newData = cloneData();
            newData.teams[id].playoff = playoff;
            return newData;
        })
    }

    const addTeam = () => {
        setData(() => {
            const newData = cloneData();
            newData.teams.push({...EMPTY_TEAM})
            const index = newData.teams.length - 1;
            newData.teams[index].id = uuidv4();
            return newData;
        })
    }

    const deleteTeam = (id) => {
        setData(() => {
            const newData = cloneData();
            newData.teams = newData.teams.filter(team => team.id !== id);
            return newData;
        })
    }

    const setPlayoffValue = (value) => {
        setData(() => {
            const newData = cloneData();
            newData.correctPlayoff = value;
            newData.playoffSet = true;
            return newData;
        });
    }

    const clearPlayoffValue = () => {
        setData(() => {
            const newData = cloneData();
            newData.correctPlayoff = 0;
            newData.playoffSet = false;
            return newData;
        });
    }

    const recalculate = () => {
        setData(data => {
            const newData = cloneData();
            newData.teams.sort((team1, team2) => compareTeams(team1, team2, data.correctPlayoff));
            return newData
        });
    }

    return (
        <>
            <div style={{display: "flex", justifyContent: "space-between"}}>
                {!presenterView && <div style={{display: "flex", gap: 5}}>
                    <Button size={"sm"} onClick={() => {
                        setLoadOpen(true)
                        browseQuizFiles();
                    }}>Otwórz</Button>
                    <Button size={"sm"} variant={"outlined"} loading={saving}
                            onClick={() => {
                                if (openedFileId) {
                                    saveExistingFile(data.name, openedFileId, JSON.stringify(data));
                                } else {
                                    save(data.name, JSON.stringify(data), (res) => {
                                        setOpenedFileId(res.id)
                                    })
                                }
                            }}>Zapisz</Button>
                    {!presenterView && <Button onClick={() => setPresenterView(true)} variant={"soft"}>
                        Widok prezentera
                    </Button>}
                </div>}
                <div style={{visibility: presenterView ? "none" : "visible"}} id="topDiv"/>
                {presenterView && <ModalClose onClick={() => setPresenterView(false)}/>}
            </div>
            <div style={{padding: 10}}>
                {!quizLoading ? <div>
                    <ContentEditable html={data.name} tagName={"h1"} onChange={(e) => {
                        setQuizName(e.currentTarget.innerHTML)
                    }}/>
                    <QuizTable loadedData={data}
                               presentationMode={presenterView}
                               setTeamName={setTeamName} setTeamSize={setTeamSize}
                               setCategoryPoints={setCategoryPoints}
                               setTeamPlayoff={setTeamPlayoff} addTeam={addTeam} deleteTeam={deleteTeam}
                               recalculate={recalculate}/>
                </div> : <LinearProgress/>}
                {!presenterView && <div style={{display: "flex", justifyContent: "center", gap: 5, marginTop: 10}}>
                    <Button onClick={recalculate}>Przelicz</Button>
                    <Button onClick={() => setPlayoffDialogOpen(true)} variant={"outlined"}>Ustaw wartość
                        dogrywki</Button>
                    <Button onClick={clearPlayoffValue} variant={"outlined"} color={"danger"}>Wyczyść wartość
                        dogrywki</Button>
                </div>}
            </div>
            <Modal open={loadOpen}>
                <ModalDialog>
                    <ModalClose onClick={() => {
                        setLoadOpen(false);
                        setSelectedFile(null);
                    }}/>
                    <DialogTitle>Otwórz</DialogTitle>
                    {!quizFilesLoading ? <DialogContent>
                        {quizFiles.length > 0 ?
                            <div style={{backgroundColor: "#e6e6e6", borderRadius: 12, padding: 5, marginBottom: 5}}>
                                {quizFiles.map(file => {
                                    return <Typography key={file.id} style={{
                                        padding: 5, borderRadius: 7, cursor: "pointer", backgroundColor:
                                            file.id === selectedFile ? "#c5ddff" : "transparent"
                                    }} onClick={() => setSelectedFile(file.id)}>
                                        {file.name}
                                    </Typography>
                                })}
                            </div> :
                            <Typography>Brak plików</Typography>}
                    </DialogContent> : <LinearProgress/>}
                    <Button disabled={!selectedFile}
                            onClick={() => {
                                setQuizLoading(true);
                                setLoadOpen(false);
                                openFile(selectedFile, (json) => {
                                    setData(json)
                                    setQuizLoading(false);
                                    document.title = json.name;
                                    setOpenedFileId(selectedFile)
                                })
                                setSelectedFile(null);
                            }}>Otwórz</Button>
                </ModalDialog>
            </Modal>

            <Modal open={playoffDialogOpen}>
                <ModalDialog>
                    <ModalClose onClick={() => setPlayoffDialogOpen(false)}/>
                    <DialogTitle>Ustaw wartość dogrywki</DialogTitle>
                    <Input onChange={e => setTempPlayoffValue(e.target.value)}/>
                    <Button onClick={() => {
                        setPlayoffValue(tempPlayoffValue)
                        setPlayoffDialogOpen(false);
                    }}>Ustaw wartość</Button>
                </ModalDialog>
            </Modal>

            <Modal open={!loggedIn}>
                <ModalDialog>
                    <div id="signInDiv"/>
                </ModalDialog>
            </Modal>
        </>
    )
}

export default App
