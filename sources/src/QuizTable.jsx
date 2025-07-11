import React, {useEffect, useState} from 'react';
import ContentEditable from "react-contenteditable";
import {IconButton} from "@mui/joy";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";


const sumTeamPoints = (team) => {
    return team.categoryPoints.map(pointObject => pointObject.points)
        .reduce((previousValue, currentValue) => previousValue + currentValue)
}

const distanceToPlayoff = (team, correctPlayoff) => {
    return Math.abs(team.playoff - correctPlayoff);
}

const anyPointsFilled = (team) => {
    return team.categoryPoints.map(category => category.filled ? 1 : 0)
        .reduce((previousValue, currentValue) => previousValue + currentValue) > 0;
}

const allPointsFilled = (team) => {
    return team.categoryPoints.map(category => category.filled ? 1 : 0)
        .reduce((previousValue, currentValue) => previousValue + currentValue) === 9;
}

const getClosestDistanceToPlayoffValue = (teams, playoffValue) => {
    let closestDistance = Number.MAX_VALUE;
    teams.forEach((team, i) => {
        if (distanceToPlayoff(team, playoffValue) < closestDistance) {
            closestDistance = distanceToPlayoff(team, playoffValue);
        }
    })
    return closestDistance;
}

const teamsAreEqual = (team1, team2, correctPlayoff) => {
    return sumTeamPoints(team1) === sumTeamPoints(team2) && distanceToPlayoff(team1, correctPlayoff) === distanceToPlayoff(team2, correctPlayoff);
}

const goTopDown = (data, startIndex, classToSet) => {
    const result = [];
    let lastWinnerIndex = startIndex;
    if (data.teams.length > startIndex) {
        result.push({row: startIndex, class: classToSet});
    }
    for (let i = lastWinnerIndex; i < data.teams.length; i++) {
        if (i + 1 < data.teams.length) {
            if (teamsAreEqual(data.teams[i], data.teams[i + 1], data.correctPlayoff)) {
                lastWinnerIndex = i + 1;
                result.push({row: i + 1, class: classToSet});
            } else {
                break
            }
        } else {
            break;
        }
    }
    return result;
}

const resolveColoring = (data) => {
    let result = [];

    if (data.teams.length === 0) {
        return result;
    }
    if (data.teams.map(team => anyPointsFilled(team) ? 1 : 0)
        .reduce((previousValue, currentValue) => previousValue + currentValue) !== data.teams.length) {
        return result;
    }

    result = [...result, ...goTopDown(data, 0, "winner")];
    result = [...result, ...goTopDown(data, result[result.length - 1].row + 1, "second-place")];
    result = [...result, ...goTopDown(data, result[result.length - 1].row + 1, "third-place")];
    result = [...result, ...goTopDown(data, result[result.length - 1].row + 1, "fourth-place")];

    const closestDistance = getClosestDistanceToPlayoffValue(data.teams.slice(result.length, data.teams.length),
        data.correctPlayoff);
    if (data.teams.length > 4) {
        for (let i = 4; i < data.teams.length; i++) {
            if (distanceToPlayoff(data.teams[i], data.correctPlayoff) === closestDistance && allPointsFilled(data.teams[i])) {
                result.push({row: i, class: "playoff-winner"})
            }
        }
    }
    return result;
}

const getColorFromArray = (colorArray, index) => {
    const foundColor = colorArray.find(color => color.row === index);
    return foundColor ? foundColor.class : "";
}

const QuizTable = ({
                       loadedData, presentationMode = false,
                       setTeamName, setTeamSize, setCategoryPoints, setTeamPlayoff, addTeam, deleteTeam
                   }) => {

    const [data, setData] = useState(loadedData || {
        correctPlayoff: 0, teams: [], playoffSet: false
    });

    useEffect(() => {
        if (!loadedData) {
            return
        }
        setData(loadedData)
    }, [loadedData])


    if (!data) {
        return <div>Loading...</div>
    }

    const rowsColors = resolveColoring(data);

    return <div>
        <div style={{display: "flex"}}>
            <div style={{display: "flex", flex: 1, flexDirection: "column"}}>
                <table>
                    <thead>
                    <tr>
                        <th className={"size"}>Liczba osób</th>
                        <th>Nazwa drużyny</th>
                        <th className={"points"}>Kategoria I</th>
                        <th className={"points"}>Kategoria II</th>
                        <th className={"points"}>Kategoria III</th>
                        <th className={"points"}>Kategoria IV</th>
                        <th className={"points"}>Kategoria V</th>
                        <th className={"points"}>Kategoria VI</th>
                        <th className={"points"}>Kategoria VII</th>
                        <th className={"points"}>Kategoria VIII</th>
                        <th className={"points"}>Kategoria IX</th>
                        <th className={"sum"}>Suma</th>
                        <th className={"playoffs"}>Dogrywka<br/>{data.playoffSet ? data.correctPlayoff : ""}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.teams.map((team, teamIndex) => {
                        return <tr key={team.id} className={getColorFromArray(rowsColors, teamIndex)}>
                            <ContentEditable key={team.id} html={team.size.toString()}
                                             onChange={e => {
                                                 const invalidChars = /[^0-9]/gi
                                                 let value = e.currentTarget.innerHTML;
                                                 if (invalidChars.test(value)) {
                                                     value = value.replace(invalidChars, "");
                                                 }
                                                 setTeamSize(teamIndex, Number(value))
                                             }}
                                             tagName={"td"}/>
                            <ContentEditable html={team.name}
                                             onChange={(e) => {
                                                 setTeamName(teamIndex, e.currentTarget.innerHTML)
                                             }}
                                             tagName={"td"}/>
                            {team.categoryPoints.map((points, i) => {
                                return <ContentEditable key={i}
                                                        html={team.categoryPoints[i].filled ? team.categoryPoints[i].points.toString() : ""}
                                                        onChange={e => {
                                                            const invalidChars = /[^0-9]/gi
                                                            let value = e.currentTarget.innerHTML;
                                                            if (invalidChars.test(value)) {
                                                                value = value.replace(invalidChars, "");
                                                            }
                                                            setCategoryPoints(teamIndex, i, Number(value))
                                                        }}
                                                        tagName={"td"}/>
                            })}
                            <td>{sumTeamPoints(team)}</td>
                            <ContentEditable html={team.playoff.toString()}
                                             onChange={e => {
                                                 const invalidChars = /[^0-9]/gi
                                                 let value = e.currentTarget.innerHTML;
                                                 if (invalidChars.test(value)) {
                                                     value = value.replace(invalidChars, "");
                                                 }
                                                 setTeamPlayoff(teamIndex, Number(value))
                                             }}
                                             tagName={"td"}/>
                        </tr>
                    })}
                    </tbody>
                </table>
                {!presentationMode &&
                    <IconButton variant={"solid"} style={{width: 50, alignSelf: "end", marginRight: 15}}
                                sx={{borderRadius: "0 0 10px 10px"}} onClick={addTeam}>
                        <AddIcon onClick={addTeam}/>
                    </IconButton>}
            </div>
            {!presentationMode && <div style={{display: "flex", flexDirection: "column", minWidth: 32}}>
                <div style={{height: 45}}/>
                <div style={{display: "flex", flexDirection: "column", justifyContent: "space-around", flex: 1}}>
                    {data.teams.map(team => {
                        return <IconButton size={"sm"} variant={"solid"} key={team.id}
                                           sx={{borderRadius: "0 10px 10px 0"}} onClick={() => deleteTeam(team.id)}>
                            <DeleteIcon/>
                        </IconButton>
                    })}
                </div>
                <div style={{height: 36}}/>
            </div>}
        </div>

    </div>
};

export default QuizTable;