import { useState } from 'react';

const CreateGameForm = ({ setToggleCreateForm, createGame }) => {

    const handleSubmit = (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const gameIsPublic = e.target.gameIsPublic.value === "true";
        createGame({ name, gameIsPublic });
    }

    return (
        <form onSubmit={e => handleSubmit(e)}>
            <div className="form-group">
                <div className="form-check">
                    <input name="gameIsPublic" value="true" type="radio" className="form-check-input" />
                    <label className="form-check-label">Public</label>
                </div>
                <div className="form-check">
                    <input name="gameIsPublic" value="false" type="radio" className="form-check-input" />
                    <label className="form-check-label">Private</label>
                </div>
            </div>
            <div className="form-group">
                <label>Name</label>
                <input className="form-control" name="name" type="text" />
            </div>
            <button type="submit" className="btn btn-primary">Create</button>
            <button className="btn btn-link"
                onClick={() => { setToggleCreateForm(false) }}
            >Cancel</button>
        </form>
    );
}

export default CreateGameForm
